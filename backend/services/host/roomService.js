const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const roomRepository = require('../../repositories/roomRepository');
const depositRepository = require('../../repositories/depositRepository');
const { RESOURCE_TYPES, generateS3Key, uploadToS3, deleteFromS3, extractS3KeyFromUrl } = require('../../utils/s3Helper');
const { geocodeAddress } = require('../../utils/geocode');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_ROOM_IMAGES = 3;
const MAX_ROOM_IMAGES = 10;

function optionalText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function optionalCoordinate(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseKeptImageUrls(value) {
  let parsed;
  try {
    parsed = Array.isArray(value) ? value : JSON.parse(String(value));
  } catch {
    throw new AppError('VALIDATION_ERROR', 'kept_image_urls must be a JSON array', 400);
  }

  if (!Array.isArray(parsed) || parsed.some((url) => typeof url !== 'string' || !url.trim())) {
    throw new AppError('VALIDATION_ERROR', 'kept_image_urls contains an invalid URL', 400);
  }

  const normalized = parsed.map((url) => url.trim());
  if (new Set(normalized).size !== normalized.length) {
    throw new AppError('VALIDATION_ERROR', 'kept_image_urls contains duplicate URLs', 400);
  }
  return normalized;
}

function buildGeocodeAddress(payload) {
  return [
    optionalText(payload.formatted_address),
    optionalText(payload.detailed_address),
    optionalText(payload.ward_name),
    optionalText(payload.district_name),
    optionalText(payload.province_name),
    'Viet Nam',
  ].filter(Boolean).join(', ');
}

async function assertVerifiedHost(userId, trx) {
  const landlord = await (trx || db)('landlords')
    .select('landlord_id')
    .where('landlord_id', userId)
    .whereNotNull('id_card_front_url')
    .whereNotNull('id_card_back_url')
    .first();

  if (!landlord) {
    throw new AppError('FORBIDDEN', 'Tai khoan chu nha phai duoc xac minh truoc khi dang phong.', 403);
  }
}

function validatePayload(payload) {
  const required = ['title', 'room_type', 'detailed_address', 'max_capacity', 'monthly_rent', 'deposit_amount'];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
    }
  }

  if (Number(payload.monthly_rent) <= 0) throw new AppError('VALIDATION_ERROR', 'monthly_rent must be > 0', 400);
  if (Number(payload.deposit_amount) < 0) throw new AppError('VALIDATION_ERROR', 'deposit_amount must be >= 0', 400);
  if (Number(payload.max_capacity) <= 0) throw new AppError('VALIDATION_ERROR', 'max_capacity must be > 0', 400);
}

async function resolveCoordinates(payload) {
  let latitude = optionalCoordinate(payload.latitude);
  let longitude = optionalCoordinate(payload.longitude);

  if (latitude !== null && longitude !== null) {
    return { latitude, longitude };
  }

  const geocodeInput = buildGeocodeAddress(payload);
  const geo = await geocodeAddress(geocodeInput);
  latitude = geo.lat;
  longitude = geo.lng;

  if (latitude !== null && longitude !== null) {
    console.info('[roomLocation] Geocoded "%s" -> lat=%s, lng=%s', geocodeInput, latitude, longitude);
  } else {
    console.warn('[roomLocation] Could not geocode address: "%s"', geocodeInput);
  }

  return { latitude, longitude };
}

function buildRoomPayload(landlordId, payload, coordinates) {
  return {
    landlord_id: landlordId,
    title: payload.title,
    room_type: payload.room_type,
    detailed_address: payload.detailed_address,
    province_name: optionalText(payload.province_name),
    district_name: optionalText(payload.district_name),
    ward_name: optionalText(payload.ward_name),
    formatted_address: optionalText(payload.formatted_address),
    place_id: optionalText(payload.place_id),
    max_capacity: Number(payload.max_capacity),
    monthly_rent: Number(payload.monthly_rent),
    deposit_amount: Number(payload.deposit_amount),
    electricity_cost: Number(payload.electricity_cost || 0),
    water_cost: Number(payload.water_cost || 0),
    internet_cost: Number(payload.internet_cost || 0),
    service_fee: Number(payload.service_fee || 0),
    room_description: payload.room_description || null,
    longitude: coordinates.longitude,
    latitude: coordinates.latitude,
  };
}

async function createRoom(landlordId, payload, files = []) {
  await assertVerifiedHost(landlordId);
  validatePayload(payload);

  if (!files || files.length < 3) {
    throw new AppError('VALIDATION_ERROR', 'At least 3 images are required', 400);
  }

  for (const file of files) {
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      throw new AppError('VALIDATION_ERROR', 'Each image must be <= 5MB', 400);
    }
  }

  const coordinates = await resolveCoordinates(payload);
  const room = buildRoomPayload(landlordId, payload, coordinates);

  return db.transaction(async (trx) => {
    const created = await roomRepository.create(room, [], trx);
    const savedUrls = [];

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const s3Key = generateS3Key(RESOURCE_TYPES.ROOM, created.room_id, file.originalname, idx + 1);
      const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);
      savedUrls.push(s3Url);
    }

    if (savedUrls.length) {
      const imgRows = savedUrls.map((url, idx) => ({
        room_id: created.room_id,
        sequence_number: idx + 1,
        image_url: url,
        is_cover: idx === 0,
      }));
      await trx('room_images').insert(imgRows);
    }

    await trx('room_approvals').insert({ room_id: created.room_id, approval_status: 'PENDING' });

    return { roomId: created.room_id, approval: 'PENDING' };
  });
}

function buildPatch(payload, existing) {
  const allowed = [
    'title',
    'room_type',
    'detailed_address',
    'province_name',
    'district_name',
    'ward_name',
    'formatted_address',
    'place_id',
    'max_capacity',
    'monthly_rent',
    'deposit_amount',
    'electricity_cost',
    'water_cost',
    'internet_cost',
    'service_fee',
    'room_description',
    'longitude',
    'latitude',
    // NOTE: 'status' is intentionally NOT editable here. Visibility changes go
    // through setRoomVisibility() so transitions stay validated; lifecycle
    // statuses (LOCKED/RENTED) are managed by the deposit/payment flow.
  ];
  const numericFields = ['max_capacity', 'monthly_rent', 'deposit_amount', 'electricity_cost', 'water_cost', 'internet_cost', 'service_fee'];
  const patch = {};

  for (const key of allowed) {
    if (payload[key] === undefined) continue;
    if (numericFields.includes(key)) patch[key] = Number(payload[key]);
    else if (key === 'latitude' || key === 'longitude') patch[key] = optionalCoordinate(payload[key]);
    else patch[key] = optionalText(payload[key]);
  }

  const locationChanged = ['detailed_address', 'province_name', 'district_name', 'ward_name', 'formatted_address', 'place_id']
    .some((key) => patch[key] !== undefined && String(patch[key] || '') !== String(existing[key] || ''));

  return { patch, locationChanged };
}

async function updateRoom(landlordId, roomId, payload = {}, files = []) {
  // NOTE: 'status' is intentionally NOT editable here — visibility is changed
  // only via setRoomVisibility() so transitions stay validated. Lifecycle
  // statuses (LOCKED/RENTED) are managed by the deposit/payment flow.
  const allowed = ['title', 'room_type', 'detailed_address', 'max_capacity', 'monthly_rent', 'deposit_amount', 'electricity_cost', 'water_cost', 'internet_cost', 'service_fee', 'room_description', 'longitude', 'latitude'];
  const numericFields = ['max_capacity', 'monthly_rent', 'deposit_amount', 'electricity_cost', 'water_cost', 'internet_cost', 'service_fee'];
  const existing = await roomRepository.findById(roomId);
  if (!existing) throw new AppError('NOT_FOUND', 'Room not found', 404);
  if (existing.landlord_id !== landlordId) throw new AppError('FORBIDDEN', 'Not allowed to modify this room', 403);

  const { patch, locationChanged } = buildPatch(payload, existing);

  if (locationChanged && (patch.latitude === undefined || patch.longitude === undefined || patch.latitude === null || patch.longitude === null)) {
    const coordinates = await resolveCoordinates({ ...existing, ...patch });
    patch.latitude = coordinates.latitude;
    patch.longitude = coordinates.longitude;
  }

  if (patch.monthly_rent !== undefined && Number(patch.monthly_rent) <= 0) throw new AppError('VALIDATION_ERROR', 'monthly_rent must be > 0', 400);
  if (patch.deposit_amount !== undefined && Number(patch.deposit_amount) < 0) throw new AppError('VALIDATION_ERROR', 'deposit_amount must be >= 0', 400);
  if (patch.max_capacity !== undefined && Number(patch.max_capacity) <= 0) throw new AppError('VALIDATION_ERROR', 'max_capacity must be > 0', 400);

  if (files.length > MAX_ROOM_IMAGES) {
    throw new AppError('VALIDATION_ERROR', `A room can have at most ${MAX_ROOM_IMAGES} images`, 400);
  }
  for (const file of files) {
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      throw new AppError('VALIDATION_ERROR', 'Each image must be <= 5MB', 400);
    }
  }

  const hasImageManifest = payload.kept_image_urls !== undefined;
  const keptImageUrls = hasImageManifest ? parseKeptImageUrls(payload.kept_image_urls) : null;

  const critical = ['monthly_rent', 'deposit_amount', 'title', 'room_description', 'room_type'];
  let needApprovalReset = false;
  for (const key of critical) {
    if (payload[key] !== undefined && String(payload[key]) !== String(existing[key] || '')) {
      needApprovalReset = true;
      break;
    }
  }
  // Đổi địa chỉ/vị trí cũng phải duyệt lại (locationChanged do buildPatch tính sẵn).
  if (locationChanged) needApprovalReset = true;
  let removedImageUrls = [];
  const result = await db.transaction(async (trx) => {
    if (Object.keys(patch).length) {
      await roomRepository.update(roomId, patch, trx);
    }

    const currentImages = await trx('room_images')
      .select('sequence_number', 'image_url', 'is_cover')
      .where('room_id', roomId)
      .orderBy('sequence_number');
    const currentCover = currentImages.find((image) => image.is_cover) || currentImages[0] || null;
    const currentOrderedUrls = currentCover
      ? [currentCover.image_url, ...currentImages.filter((image) => image.image_url !== currentCover.image_url).map((image) => image.image_url)]
      : [];
    let imageChanged = false;

    if (hasImageManifest) {
      const currentUrlSet = new Set(currentImages.map((image) => image.image_url));
      if (keptImageUrls.some((url) => !currentUrlSet.has(url))) {
        throw new AppError('VALIDATION_ERROR', 'Cannot retain an image that does not belong to this room', 400);
      }

      const nextImageCount = keptImageUrls.length + files.length;
      if (nextImageCount < MIN_ROOM_IMAGES || nextImageCount > MAX_ROOM_IMAGES) {
        throw new AppError(
          'VALIDATION_ERROR',
          `A room must have between ${MIN_ROOM_IMAGES} and ${MAX_ROOM_IMAGES} images`,
          400,
        );
      }

      const requestedCoverUrl = optionalText(payload.cover_image_url);
      if (requestedCoverUrl && !keptImageUrls.includes(requestedCoverUrl)) {
        throw new AppError('VALIDATION_ERROR', 'cover_image_url must be one of the retained images', 400);
      }
      let requestedCoverNewIndex = null;
      if (!requestedCoverUrl && payload.cover_new_index !== undefined && payload.cover_new_index !== '') {
        requestedCoverNewIndex = Number(payload.cover_new_index);
        if (!Number.isInteger(requestedCoverNewIndex) || requestedCoverNewIndex < 0 || requestedCoverNewIndex >= files.length) {
          throw new AppError('VALIDATION_ERROR', 'cover_new_index is invalid', 400);
        }
      }

      const savedUrls = [];
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const s3Key = generateS3Key(RESOURCE_TYPES.ROOM, roomId, file.originalname, idx + 1);
        const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);
        savedUrls.push(s3Url);
      }

      const allUrls = [...keptImageUrls, ...savedUrls];
      let coverUrl = requestedCoverUrl;
      if (!coverUrl && requestedCoverNewIndex !== null) coverUrl = savedUrls[requestedCoverNewIndex];

      if (!coverUrl && currentCover && keptImageUrls.includes(currentCover.image_url)) {
        coverUrl = currentCover.image_url;
      }
      coverUrl = coverUrl || allUrls[0];

      const desiredUrls = [coverUrl, ...allUrls.filter((url) => url !== coverUrl)];
      imageChanged = JSON.stringify(desiredUrls) !== JSON.stringify(currentOrderedUrls);
      if (imageChanged) {
        await roomRepository.replaceImages(roomId, desiredUrls, trx);
      }
      removedImageUrls = currentImages
        .map((image) => image.image_url)
        .filter((url) => !keptImageUrls.includes(url));
    } else if (files.length) {
      // Backward compatibility for clients that still replace the complete gallery.
      const savedUrls = [];
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const s3Key = generateS3Key(RESOURCE_TYPES.ROOM, roomId, file.originalname, idx + 1);
        const s3Url = await uploadToS3(file.buffer, s3Key, file.mimetype);
        savedUrls.push(s3Url);
      }
      await roomRepository.replaceImages(roomId, savedUrls, trx);
      removedImageUrls = currentImages.map((image) => image.image_url);
      imageChanged = true;
    }

    if (imageChanged) needApprovalReset = true;

    if (needApprovalReset) {
      // room_approvals không lưu snapshot nội dung và rooms chỉ giữ 1 bản ghi
      // (trạng thái mới nhất), nên giữ nhiều dòng là vô nghĩa:
      //  - nhiều PENDING ⇒ admin thấy cùng 1 phòng nhiều lần;
      //  - còn dòng APPROVED cũ ⇒ findPublicById vẫn cho phòng hiển thị công
      //    khai với nội dung vừa sửa dù CHƯA được duyệt lại.
      // Xoá sạch approval cũ rồi chèn đúng 1 dòng PENDING ⇒ luôn chỉ có 1 yêu
      // cầu duyệt (cái mới nhất có hiệu lực) và phòng ẩn khỏi public tới khi duyệt.
      await trx('room_approvals').where({ room_id: roomId }).del();
      await trx('room_approvals').insert({ room_id: roomId, approval_status: 'PENDING' });
    }

    const fresh = await roomRepository.findById(roomId);
    const imgs = await trx('room_images')
      .select('sequence_number', 'image_url', 'is_cover')
      .where('room_id', roomId)
      .orderBy('sequence_number');
    const latestApproval = await trx('room_approvals').where('room_id', roomId).orderBy('approval_id', 'desc').first();

    return { room: fresh, images: imgs, approval: latestApproval ? latestApproval.approval_status : null };
  });

  // Delete only images removed from the gallery, after the database update succeeds.
  for (const imageUrl of removedImageUrls) {
    const s3Key = extractS3KeyFromUrl(imageUrl);
    if (!s3Key) continue;
    try {
      await deleteFromS3(s3Key);
    } catch (err) {
      console.error(`Failed to delete removed S3 image: ${s3Key}`, err);
    }
  }

  return result;
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

/**
 * Toggle a room's public visibility (Hiển thị / Tạm ẩn).
 *
 * - visible=false: AVAILABLE -> HIDDEN (chỉ cho phép khi đang AVAILABLE)
 * - visible=true:  HIDDEN    -> AVAILABLE
 *
 * Không cho ẩn phòng đang LOCKED/RENTED (đang có giao dịch/đã cho thuê).
 * Không reset approval (đây không phải thay đổi nội dung tin).
 */
async function setRoomVisibility(landlordId, roomId, visible) {
  if (typeof visible !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', 'visible must be a boolean', 400);
  }

  const existing = await roomRepository.findById(roomId);
  if (!existing) throw new AppError('NOT_FOUND', 'Room not found', 404);
  if (existing.landlord_id !== landlordId) {
    throw new AppError('FORBIDDEN', 'Not allowed to modify this room', 403);
  }

  const current = existing.status;

  if (visible) {
    // Bỏ ẩn: chỉ có ý nghĩa khi đang HIDDEN; các trạng thái khác coi như no-op.
    if (current !== 'HIDDEN') {
      return { room_id: roomId, status: current };
    }
    const updated = await roomRepository.update(roomId, { status: 'AVAILABLE', updated_at: db.fn.now() });
    return { room_id: roomId, status: updated ? updated.status : 'AVAILABLE' };
  }

  // Ẩn phòng: chỉ cho phép khi đang AVAILABLE.
  if (current === 'HIDDEN') {
    return { room_id: roomId, status: current };
  }
  if (current !== 'AVAILABLE') {
    throw new AppError('CONFLICT', 'Không thể ẩn phòng đang có giao dịch hoặc đã cho thuê.', 409);
  }
  const updated = await roomRepository.update(roomId, { status: 'HIDDEN', updated_at: db.fn.now() });
  return { room_id: roomId, status: updated ? updated.status : 'HIDDEN' };
}

async function deleteRoom(landlordId, roomId) {
  if (!roomId) throw new AppError('VALIDATION_ERROR', 'roomId is required', 400);

  const images = await db('room_images').select('image_url').where('room_id', roomId);

  return db.transaction(async (trx) => {
    const room = await roomRepository.findById(roomId, trx);
    if (!room) throw new AppError('NOT_FOUND', 'Room not found', 404);
    if (room.landlord_id !== landlordId) throw new AppError('FORBIDDEN', 'Not owner', 403);

    const depositCount = await depositRepository.countByRoomId(roomId, trx);
    if (depositCount > 0) {
      throw new AppError('CONFLICT', 'Room has active deposits; cannot delete', 409);
    }

    await roomRepository.remove(roomId, trx);

    try {
      await trx('system_logs').insert({ user_id: landlordId, action: `DELETE_ROOM:${roomId}` });
    } catch (err) {
      console.error('Failed to write system log for deleteRoom', err);
    }

    for (const img of images) {
      const s3Key = extractS3KeyFromUrl(img.image_url);
      if (s3Key) {
        deleteFromS3(s3Key).catch((err) => {
          console.error(`Failed to clean S3 image after room delete: ${s3Key}`, err);
        });
      }
    }

    return true;
  });
}

const FALLBACK_ROOM_IMAGE = '/images/booking/host/studio-apartment.png';

/**
 * Landlord dashboard overview: room counts by bucket, average rating,
 * monthly revenue for a year (selectable), and top-3 rated rooms.
 */
async function getOverview(landlordId, { year } = {}) {
  const targetYear = Number(year) || new Date().getFullYear();

  const [stats, revenueRows, topRated] = await Promise.all([
    roomRepository.getLandlordStats(landlordId),
    roomRepository.getLandlordMonthlyRevenue(landlordId, targetYear),
    roomRepository.findTopRatedByLandlord(landlordId, 3),
  ]);

  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }));
  for (const row of revenueRows) {
    const idx = Number(row.month) - 1;
    if (idx >= 0 && idx < 12) monthly[idx].amount = Number(row.amount) || 0;
  }
  const totalRevenue = monthly.reduce((sum, m) => sum + m.amount, 0);

  return {
    stats: {
      total: Number(stats.total) || 0,
      rented: Number(stats.rented) || 0,
      available: Number(stats.available) || 0,
      pending: Number(stats.pending) || 0,
      hidden: Number(stats.hidden) || 0,
      averageRating: Number(stats.average_rating) || 0,
    },
    revenue: { year: targetYear, totalRevenue, monthly },
    featuredRooms: topRated.map((r) => ({
      room_id: r.room_id,
      title: r.title,
      detailed_address: r.detailed_address,
      monthly_rent: Number(r.monthly_rent) || 0,
      status: r.status,
      approval_status: r.approval_status || null,
      average_rating: Number(r.average_rating) || 0,
      favorite_count: Number(r.favorite_count) || 0,
      cover_image_url: r.cover_image_url || FALLBACK_ROOM_IMAGE,
    })),
  };
}

module.exports = {
  createRoom,
  listMyRooms,
  updateRoom,
  setRoomVisibility,
  deleteRoom,
  getOverview,
};
