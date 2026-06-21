const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const roomRepository = require('../../repositories/roomRepository');
const systemLogRepository = require('../../repositories/systemLogRepository');
const notificationRepository = require('../../repositories/guest/notificationRepository');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function listPendingRooms(query = {}) {
  const page = normalizeNumber(query.page, DEFAULT_PAGE);
  const limit = normalizeNumber(query.limit, DEFAULT_LIMIT);

  if (page <= 0 || !Number.isInteger(page)) {
    throw new AppError('VALIDATION_ERROR', 'page must be a positive integer', 400);
  }

  if (limit <= 0 || !Number.isInteger(limit) || limit > MAX_LIMIT) {
    throw new AppError('VALIDATION_ERROR', 'limit must be a positive integer and no more than ' + MAX_LIMIT, 400);
  }

  const status = query.status;
  const keyword = query.keyword ? String(query.keyword).trim() : undefined;

  const rows = await roomRepository.findPendingRooms({ page, limit, status, keyword });
  const total = await roomRepository.countPendingRooms({ status, keyword });

  const mappedItems = rows.map((row) => ({
    roomId: row.room_id,
    title: row.title,
    roomType: row.room_type,
    detailedAddress: row.detailed_address,
    monthlyRent: Number(row.monthly_rent),
    depositAmount: Number(row.deposit_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    host: {
      landlordId: row.landlord_id,
      fullName: row.landlord_full_name,
      username: row.landlord_username,
      email: row.landlord_email,
      phoneNumber: row.landlord_phone_number,
      avatarUrl: row.landlord_avatar_url || null,
    },
    coverImageUrl: row.cover_image_url || null,
    approvalId: row.approval_id,
    approvalCreatedAt: row.approval_created_at,
  }));

  return {
    items: mappedItems,
    pagination: {
      page,
      limit,
      total,
    },
  };
}

async function approveRoom(roomId, adminId) {
  return await db.transaction(async (trx) => {
    const room = await roomRepository.findById(roomId, trx);
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng', 404);
    }
    if (room.approval_status !== 'PENDING') {
      throw new AppError('CONFLICT', 'Phòng không ở trạng thái chờ duyệt', 409);
    }

    const updated = await roomRepository.updateApprovalStatus(roomId, 'APPROVED', trx);
    
    await systemLogRepository.insertLog({
      user_id: adminId,
      action: 'ADMIN_APPROVED_ROOM: ' + roomId
    }, trx);

    await notificationRepository.insertNotification({
      user_id: room.landlord_id,
      title: 'Phòng đã được duyệt',
      content: 'Bài đăng phòng của bạn đã được phê duyệt và dang hiển thị công khai.',
      notification_type: 'ROOM_APPROVAL',
      status: 'UNREAD'
    }, trx);

    return {
      roomId: roomId,
      approvalStatus: 'APPROVED'
    };
  });
}

async function rejectRoom(roomId, adminId, reason) {
  if (!reason || reason.trim() === '') {
    throw new AppError('VALIDATION_ERROR', 'Lý do từ chối không đảc để trống', 400);
  }

  return await db.transaction(async (trx) => {
    const room = await roomRepository.findById(roomId, trx);
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng', 404);
    }
    if (room.approval_status !== 'PENDING') {
      throw new AppError('CONFLICT', 'Phòng không ở trạng thái chờ duyệt', 409);
    }

    const updated = await roomRepository.updateApprovalStatus(roomId, 'REJECTED', trx);
    
    await systemLogRepository.insertLog({
      user_id: adminId,
      action: 'ADMIN_REJECTED_ROOM: ' + roomId
    }, trx);

    await notificationRepository.insertNotification({
      user_id: room.landlord_id,
      title: 'Bài đăng phòng bị từ chối',
      content: 'Bài đăng của bạn bị từ chối với lý do: ' + reason.trim(),
      notification_type: 'ROOM_APPROVAL',
      status: 'UNREAD'
    }, trx);

    return {
      roomId: roomId,
      approvalStatus: 'REJECTED'
    };
  });
}

module.exports = {
  listPendingRooms,
  approveRoom,
  rejectRoom,
};
