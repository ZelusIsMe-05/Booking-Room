const conversationRepository = require('../../repositories/guest/conversationRepository');
const AppError = require('../../utils/AppError');
const db = require('../../config/db');

/**
 * Business logic layer for Conversations and Messages.
 */

/**
 * Resolve specific role IDs from a generic user ID.
 * Since a user could be both a tenant and a landlord, we need to extract both
 * and use the appropriate one based on context.
 */
async function resolveRoleIds(userId) {
  const [tenant, landlord] = await Promise.all([
    db('tenants').where({ tenant_id: userId }).first(),
    db('landlords').where({ landlord_id: userId }).first()
  ]);

  return {
    tenantId: tenant ? tenant.tenant_id : null,
    landlordId: landlord ? landlord.landlord_id : null
  };
}

/**
 * Get an existing conversation or create a new one between a Tenant and a Landlord.
 *
 * @param {string} userId - The user ID of the caller
 * @param {string} role - The active role of the caller ('TENANT' or 'LANDLORD')
 * @param {string} peerUserId - The user ID of the other party
 */
async function getOrCreateConversation(userId, role, peerUserId) {
  const { tenantId, landlordId } = await resolveRoleIds(userId);
  const peerRoles = await resolveRoleIds(peerUserId);

  let targetTenantId;
  let targetLandlordId;

  if (role === 'TENANT') {
    if (!tenantId) throw new AppError('FORBIDDEN', 'Bạn không phải là Khách thuê.', 403);
    if (!peerRoles.landlordId) throw new AppError('BAD_REQUEST', 'Người dùng kia không phải là Chủ trọ.', 400);
    targetTenantId = tenantId;
    targetLandlordId = peerRoles.landlordId;
  } else if (role === 'LANDLORD') {
    if (!landlordId) throw new AppError('FORBIDDEN', 'Bạn không phải là Chủ trọ.', 403);
    if (!peerRoles.tenantId) throw new AppError('BAD_REQUEST', 'Người dùng kia không phải là Khách thuê.', 400);
    targetTenantId = peerRoles.tenantId;
    targetLandlordId = landlordId;
  } else {
    throw new AppError('BAD_REQUEST', 'Role không hợp lệ.', 400);
  }

  // Prevent chatting with oneself
  if (targetTenantId === targetLandlordId) {
    throw new AppError('BAD_REQUEST', 'Không thể tự chat với chính mình.', 400);
  }

  let conversation = await conversationRepository.findConversationByParticipants(targetTenantId, targetLandlordId);

  if (!conversation) {
    conversation = await conversationRepository.createConversation(targetTenantId, targetLandlordId);
  }

  return conversation;
}

/**
 * List all conversations for the logged-in user.
 */
async function listConversations(userId, role) {
  const { tenantId, landlordId } = await resolveRoleIds(userId);
  
  if (role === 'TENANT' && !tenantId) throw new AppError('FORBIDDEN', 'Access denied.', 403);
  if (role === 'LANDLORD' && !landlordId) throw new AppError('FORBIDDEN', 'Access denied.', 403);

  const specificId = role === 'TENANT' ? tenantId : landlordId;
  const conversations = await conversationRepository.findConversationsByUser(role, specificId);

  // Tự động chuyển các tin nhắn 'SENT' thành 'DELIVERED' (Vì người dùng vừa kéo tin nhắn về)
  if (conversations && conversations.length > 0) {
    const convIds = conversations.map(c => c.conversation_id);
    await conversationRepository.markDeliveredForConversations(convIds, userId);
  }

  return conversations;
}

/**
 * Verify if a user is a participant in a conversation.
 */
async function verifyParticipant(conversationId, userId) {
  const conversation = await conversationRepository.findConversationById(conversationId);
  if (!conversation) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy cuộc hội thoại.', 404);
  }

  const { tenantId, landlordId } = await resolveRoleIds(userId);

  if (conversation.tenant_id !== tenantId && conversation.landlord_id !== landlordId) {
    throw new AppError('FORBIDDEN', 'Bạn không có quyền truy cập cuộc hội thoại này.', 403);
  }

  return conversation;
}

/**
 * Retrieve messages for a conversation.
 */
async function getMessages(conversationId, userId, role, { page = 1, limit = 20 }) {
  const conversation = await verifyParticipant(conversationId, userId);

  // Tự động chuyển các tin nhắn 'SENT' thành 'DELIVERED' khi tải chi tiết
  await conversationRepository.markDeliveredForConversations([conversationId], userId);

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  let clearedAt = null;
  if (role === 'TENANT') {
    clearedAt = conversation.tenant_cleared_at;
  } else if (role === 'LANDLORD') {
    clearedAt = conversation.landlord_cleared_at;
  }

  const { items, total } = await conversationRepository.findMessages(conversationId, { page: p, limit: l, clearedAt });
  return { items, total, page: p, limit: l };
}

/**
 * Send a new message in a conversation.
 */
async function sendMessage(conversationId, userId, content) {
  if (!content || content.trim().length === 0) {
    throw new AppError('BAD_REQUEST', 'Nội dung tin nhắn không được để trống.', 400);
  }

  const conversation = await verifyParticipant(conversationId, userId);
  const { tenantId, landlordId } = await resolveRoleIds(userId);

  const message = await conversationRepository.insertMessage({
    conversation_id: conversationId,
    sender_id: userId,
    content: content.trim()
  });

  // Tự động gửi thông báo (Notification) cho người nhận
  // Tìm xem người nhận là Tenant hay Landlord (dựa vào ID của người gửi)
  const isSenderTenant = (conversation.tenant_id === tenantId);
  const peerUserId = isSenderTenant ? conversation.landlord_id : conversation.tenant_id;
  // Lưu ý: conversation.landlord_id và conversation.tenant_id đều trỏ đến users.user_id 
  // (do cấu trúc database map 1-1, xem lại file migration)
  
  const notificationService = require('./notificationService');
  await notificationService.createNotification(
    peerUserId,
    'Tin nhắn mới',
    'Bạn có một tin nhắn mới trong phòng chat.',
    'NEW_MESSAGE'
  );

  return message;
}

/**
 * Mark all messages in a conversation as read.
 */
async function markAsRead(conversationId, userId) {
  await verifyParticipant(conversationId, userId);
  await conversationRepository.markMessagesAsRead(conversationId, userId);
}

/**
 * Soft clear/delete a conversation for the caller.
 */
async function clearConversation(conversationId, userId, role) {
  if (role !== 'TENANT' && role !== 'LANDLORD') {
    throw new AppError('BAD_REQUEST', 'Role không hợp lệ.', 400);
  }
  
  // Verify participant permissions (throws if not authorized)
  await verifyParticipant(conversationId, userId);
  
  await conversationRepository.clearConversation(conversationId, role, new Date());
}

module.exports = {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  markAsRead,
  clearConversation
};
