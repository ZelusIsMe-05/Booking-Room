const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const roomRepository = require('../../repositories/roomRepository');
const depositRepository = require('../../repositories/depositRepository');
const { RESOURCE_TYPES, generateS3Key, uploadToS3, deleteFromS3, extractS3KeyFromUrl } = require('../../utils/s3Helper');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

async function assertVerifiedHost(userId, trx) {
  const landlord = await (trx || db)('landlords')
    .select('landlord_id')
    .where('landlord_id', userId)
    .whereNotNull('id_card_front_url')
    .whereNotNull('id_card_back_url')
    .first();

  if (!landlord) {
    throw new AppError('FORBIDDEN', 'Tài khoản chủ nhà phải được xác minh trước khi đăng phòng.', 403);
  }
}

function validatePayload(payload) {
	const required = ['title', 'room_type', 'detailed_address', 'max_capacity', 'monthly_rent', 'deposit_amount'];
	for (const f of required) {
		if (payload[f] === undefined || payload[f] === null || payload[f] === '') {
			throw new AppError('VALIDATION_ERROR', `${f} is required`, 400);
		}
	}

	if (Number(payload.monthly_rent) <= 0) throw new AppError('VALIDATION_ERROR', 'monthly_rent must be > 0', 400);
	if (Number(payload.deposit_amount) < 0) throw new AppError('VALIDATION_ERROR', 'deposit_amount must be >= 0', 400);
	if (Number(payload.max_capacity) <= 0) throw new AppError('VALIDATION_ERROR', 'max_capacity must be > 0', 400);
}

async function createRoom(landlordId, payload, files = []) {
	await assertVerifiedHost(landlordId);
	validatePayload(payload);

	if (!files || files.length < 3) {
		throw new AppError('VALIDATION_ERROR', 'At least 3 images are required', 400);
	}

	for (const f of files) {
		if (!f.size || f.size > MAX_IMAGE_BYTES) {
			throw new AppError('VALIDATION_ERROR', 'Each image must be <= 5MB', 400);
		}
	}

	// Build room object according to schema
	const room = {
		landlord_id: landlordId,
		title: payload.title,
		room_type: payload.room_type,
		detailed_address: payload.detailed_address,
		max_capacity: Number(payload.max_capacity),
		monthly_rent: Number(payload.monthly_rent),
		deposit_amount: Number(payload.deposit_amount),
		electricity_cost: Number(payload.electricity_cost || 0),
		water_cost: Number(payload.water_cost || 0),
		internet_cost: Number(payload.internet_cost || 0),
		service_fee: Number(payload.service_fee || 0),
		room_description: payload.room_description || null,
		longitude: payload.longitude || null,
		latitude: payload.latitude || null,
	};

	// Use transaction: insert room, images, approval
	return await db.transaction(async (trx) => {
		const created = await roomRepository.create(room, [], trx);
		const savedUrls = [];

		// Upload images to AWS S3
		for (let idx = 0; idx < files.length; idx++) {
			const file = files[idx];
			const s3Key = generateS3Key(RESOURCE_TYPES.ROOM, created.room_id, file.originalname, idx + 1);
			const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);
			savedUrls.push(s3Url);
		}

		// Insert images into room_images table
		if (savedUrls.length) {
			const imgRows = savedUrls.map((url, idx) => ({
				room_id: created.room_id,
				sequence_number: idx + 1,
				image_url: url,
				is_cover: idx === 0,
			}));
			await trx('room_images').insert(imgRows);
		}

		// Insert approval record
		await trx('room_approvals').insert({ room_id: created.room_id, approval_status: 'PENDING' });

		return { roomId: created.room_id, approval: 'PENDING' };
	});
}

async function updateRoom(landlordId, roomId, payload = {}, files = []) {
	const allowed = ['title','room_type','detailed_address','max_capacity','monthly_rent','deposit_amount','electricity_cost','water_cost','internet_cost','service_fee','room_description','longitude','latitude','status'];
	const numericFields = ['max_capacity','monthly_rent','deposit_amount','electricity_cost','water_cost','internet_cost','service_fee'];

	// Fetch existing
	const existing = await roomRepository.findById(roomId);
	if (!existing) throw new AppError('NOT_FOUND', 'Room not found', 404);
	if (existing.landlord_id !== landlordId) throw new AppError('FORBIDDEN', 'Not allowed to modify this room', 403);

	const patch = {};
	for (const k of allowed) {
		if (payload[k] !== undefined) {
			patch[k] = numericFields.includes(k) ? Number(payload[k]) : payload[k];
		}
	}

	// Validate numeric values when provided
	if (patch.monthly_rent !== undefined && Number(patch.monthly_rent) <= 0) throw new AppError('VALIDATION_ERROR', 'monthly_rent must be > 0', 400);
	if (patch.deposit_amount !== undefined && Number(patch.deposit_amount) < 0) throw new AppError('VALIDATION_ERROR', 'deposit_amount must be >= 0', 400);
	if (patch.max_capacity !== undefined && Number(patch.max_capacity) <= 0) throw new AppError('VALIDATION_ERROR', 'max_capacity must be > 0', 400);

	// Determine whether we need to reset approval
	const critical = ['monthly_rent','deposit_amount','title','room_description','room_type'];
	let needApprovalReset = false;
	for (const c of critical) {
		if (payload[c] !== undefined && String(payload[c]) !== String(existing[c] || '')) {
			needApprovalReset = true; break;
		}
	}
	if (files && files.length) needApprovalReset = true;

	return await db.transaction(async (trx) => {
		let updated = existing;
		if (Object.keys(patch).length) {
			updated = await roomRepository.update(roomId, patch, trx);
		}

		// Handle S3 images replacement if files provided
		if (files && files.length) {
			// 1. (Optional) Delete old images from S3 to prevent orphans
			const oldImages = await trx('room_images').select('image_url').where('room_id', roomId);
			for (const img of oldImages) {
				const s3Key = extractS3KeyFromUrl(img.image_url);
				if (s3Key) {
					try {
						await deleteFromS3(s3Key);
					} catch (err) {
						console.error(`Không thể xóa ảnh cũ trên S3: ${s3Key}`, err);
					}
				}
			}

			// 2. Upload new images to S3
			const savedUrls = [];
			for (let idx = 0; idx < files.length; idx++) {
				const file = files[idx];
				if (!file.size || file.size > MAX_IMAGE_BYTES) {
					throw new AppError('VALIDATION_ERROR', 'Each image must be <= 5MB', 400);
				}
				const s3Key = generateS3Key(RESOURCE_TYPES.ROOM, roomId, file.originalname, idx + 1);
				const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);
				savedUrls.push(s3Url);
			}

			await roomRepository.replaceImages(roomId, savedUrls, trx);
		}

		if (needApprovalReset) {
			await trx('room_approvals').insert({ room_id: roomId, approval_status: 'PENDING' });
		}

		// Fetch fresh data
		const fresh = await roomRepository.findById(roomId);
		const imgs = await trx('room_images').select('sequence_number','image_url','is_cover').where('room_id', roomId).orderBy('sequence_number');
		const latestApproval = await trx('room_approvals').where('room_id', roomId).orderBy('approval_id', 'desc').first();

		return { room: fresh, images: imgs, approval: latestApproval ? latestApproval.approval_status : null };
	});
}

async function listMyRooms(landlordId, query) {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 20;
	const sortBy = query.sortBy || 'created_at';
	const order = query.order || 'desc';
	const status = query.status;

	if (page <= 0 || limit <= 0) {
		throw new AppError('VALIDATION_ERROR', 'Invalid pagination parameters', 400);
	}

	const { items, total } = await roomRepository.findByLandlord(landlordId, { page, limit, sortBy, order, status });

	return { items, pagination: { page, limit, total } };
}

async function deleteRoom(landlordId, roomId) {
	if (!roomId) throw new AppError('VALIDATION_ERROR', 'roomId is required', 400);

	// Load existing room image URLs before we remove them from DB (cascade delete)
	const images = await db('room_images').select('image_url').where('room_id', roomId);

	return await db.transaction(async (trx) => {
		// Load room
		const room = await roomRepository.findById(roomId, trx);
		if (!room) throw new AppError('NOT_FOUND', 'Room not found', 404);
		if (room.landlord_id !== landlordId) throw new AppError('FORBIDDEN', 'Not owner', 403);

		// Check deposits existence
		const depositCount = await depositRepository.countByRoomId(roomId, trx);
		if (depositCount > 0) {
			throw new AppError('CONFLICT', 'Room has active deposits; cannot delete', 409);
		}

		// Perform delete (will cascade images, favorites, approvals)
		await roomRepository.remove(roomId, trx);

		// Audit log
		try {
			await trx('system_logs').insert({ user_id: landlordId, action: `DELETE_ROOM:${roomId}` });
		} catch (e) {
			// don't fail deletion if logging fails, but print
			console.error('Failed to write system log for deleteRoom', e);
		}

		// Clean up files on AWS S3 asynchronously after transaction commits successfully
		for (const img of images) {
			const s3Key = extractS3KeyFromUrl(img.image_url);
			if (s3Key) {
				deleteFromS3(s3Key).catch(e => {
					console.error(`Lỗi khi dọn dẹp ảnh S3 khi xóa phòng: ${s3Key}`, e);
				});
			}
		}

		return true;
	});
}

module.exports = {
	createRoom,
	listMyRooms,
	updateRoom,
	deleteRoom,
};
