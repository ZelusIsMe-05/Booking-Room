const db = require('../../config/db');

/**
 * Insert a new violation report into the database.
 */
async function createReport(data) {
  const [report] = await db('violation_reports').insert(data).returning('*');
  return report;
}

/**
 * Retrieve paginated violation reports for a specific tenant.
 */
async function findReportsByTenant(tenantId, { limit, offset }) {
  const [{ count }] = await db('violation_reports')
    .where({ tenant_id: tenantId })
    .count('report_id as count');

  const items = await db('violation_reports')
    .leftJoin('rooms', 'violation_reports.room_id', 'rooms.room_id')
    .leftJoin('users', 'violation_reports.landlord_id', 'users.user_id')
    .where({ 'violation_reports.tenant_id': tenantId })
    .orderBy('violation_reports.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'violation_reports.*',
      'rooms.title as room_title',
      'users.full_name as landlord_name'
    );

  return { items, total: Number(count) };
}

/**
 * Retrieve details of a specific report, ensuring it belongs to the tenant.
 */
async function findReportById(reportId, tenantId) {
  return await db('violation_reports')
    .leftJoin('rooms', 'violation_reports.room_id', 'rooms.room_id')
    .leftJoin('users', 'violation_reports.landlord_id', 'users.user_id')
    .where({ 'violation_reports.report_id': reportId, 'violation_reports.tenant_id': tenantId })
    .select(
      'violation_reports.*',
      'rooms.title as room_title',
      'users.full_name as landlord_name'
    )
    .first();
}

/**
 * Check if a room exists.
 */
async function checkRoomExists(roomId) {
  return await db('rooms').where({ room_id: roomId }).first();
}

/**
 * Check if a landlord exists.
 */
async function checkLandlordExists(landlordId) {
  return await db('landlords').where({ landlord_id: landlordId }).first();
}

module.exports = {
  createReport,
  findReportsByTenant,
  findReportById,
  checkRoomExists,
  checkLandlordExists
};
