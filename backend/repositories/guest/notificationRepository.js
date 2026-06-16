const db = require('../../config/db');

/**
 * Find paginated notifications for a specific user.
 */
async function findNotificationsByUser(userId, { limit, offset }) {
  const [{ count }] = await db('notifications')
    .where({ user_id: userId })
    .count('notification_id as count');

  const items = await db('notifications')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'notification_id',
      'title',
      'content',
      'notification_type',
      'status',
      'created_at'
    );

  return { items, total: Number(count) };
}

/**
 * Insert a new notification.
 * This is an internal function not directly exposed via standard public API routes.
 */
async function insertNotification(data, trx) {
  const conn = trx || db;
  const [notification] = await conn('notifications')
    .insert(data)
    .returning('*');
  return notification;
}

/**
 * Mark a single notification as READ for a specific user.
 */
async function markAsRead(notificationId, userId) {
  const [updated] = await db('notifications')
    .where({ notification_id: notificationId, user_id: userId })
    .update({ status: 'READ' })
    .returning('*');
  return updated;
}

/**
 * Mark all UNREAD notifications as READ for a specific user.
 */
async function markAllAsRead(userId) {
  await db('notifications')
    .where({ user_id: userId, status: 'UNREAD' })
    .update({ status: 'READ' });
}

module.exports = {
  findNotificationsByUser,
  insertNotification,
  markAsRead,
  markAllAsRead
};
