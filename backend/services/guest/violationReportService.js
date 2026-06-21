const violationReportRepository = require('../../repositories/guest/violationReportRepository');
const AppError = require('../../utils/AppError');
const db = require('../../config/db');
const { uploadFile, RESOURCE_TYPES } = require('../../utils/s3Helper');

/**
 * Helper to ensure the user is a tenant.
 */
async function getTenantId(userId) {
  const tenant = await db('tenants').where({ tenant_id: userId }).first();
  if (!tenant) {
    throw new AppError('FORBIDDEN', 'Chỉ Khách thuê (Tenant) mới được gửi báo cáo vi phạm.', 403);
  }
  return tenant.tenant_id;
}

/**
 * Submit a new violation report.
 */
async function submitReport(userId, body, file) {
  const tenantId = await getTenantId(userId);

  const { room_id, landlord_id, reason } = body;

  if (!reason || reason.trim() === '') {
    throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp lý do báo cáo (reason).', 400);
  }

  if (!room_id && !landlord_id) {
    throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp đối tượng báo cáo (room_id hoặc landlord_id).', 400);
  }

  // Validate eligibility
  if (room_id) {
    const isEligible = await db('deposits')
      .join('transactions', 'deposits.deposit_id', 'transactions.deposit_id')
      .where({
        'deposits.room_id': room_id,
        'deposits.tenant_id': tenantId,
        'deposits.status': 'ACCEPTED',
        'transactions.status': 'SUCCESS'
      })
      .first();
    if (!isEligible) {
      throw new AppError('BAD_REQUEST', 'Bạn chỉ có thể khiếu nại phòng này khi đã thanh toán cọc thành công và đơn cọc được chủ trọ duyệt.', 400);
    }
  }

  if (landlord_id) {
    const isEligible = await db('deposits')
      .join('transactions', 'deposits.deposit_id', 'transactions.deposit_id')
      .where({
        'deposits.landlord_id': landlord_id,
        'deposits.tenant_id': tenantId,
        'deposits.status': 'ACCEPTED',
        'transactions.status': 'SUCCESS'
      })
      .first();
    if (!isEligible) {
      throw new AppError('BAD_REQUEST', 'Bạn chỉ có thể khiếu nại chủ trọ này khi đã thanh toán cọc thành công và đơn cọc được chủ trọ duyệt.', 400);
    }
  }

  let evidence_image_url = null;
  if (file) {
    evidence_image_url = await uploadFile(file, RESOURCE_TYPES.REPORT, userId);
  } else if (body.evidence_image_url) {
    evidence_image_url = body.evidence_image_url;
  }

  const report = await violationReportRepository.createReport({
    tenant_id: tenantId,
    room_id: room_id || null,
    landlord_id: landlord_id || null,
    reason: reason.trim(),
    evidence_image_url,
    resolution_status: 'PENDING'
  });

  // Tự động gửi notification cho Tenant báo rằng hệ thống đã tiếp nhận
  const notificationService = require('./notificationService');
  await notificationService.createNotification(
    userId,
    'Đã nhận báo cáo vi phạm',
    `Hệ thống đã tiếp nhận báo cáo của bạn (Mã: ${report.report_id.split('-')[0]}). Chúng tôi sẽ xác minh và xử lý nghiêm khắc.`,
    'SYSTEM'
  );

  return report;
}

/**
 * Get a paginated list of reports submitted by the logged-in tenant.
 */
async function getReports(userId, { page = 1, limit = 20 }) {
  const tenantId = await getTenantId(userId);

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const { items, total } = await violationReportRepository.findReportsByTenant(tenantId, { limit: l, offset });
  return { items, total, page: p, limit: l };
}

/**
 * Get details of a specific report.
 */
async function getReportDetail(reportId, userId) {
  const tenantId = await getTenantId(userId);

  const report = await violationReportRepository.findReportById(reportId, tenantId);
  if (!report) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy báo cáo hoặc bạn không có quyền xem.', 404);
  }
  return report;
}

/**
 * Retrieve eligible rooms and landlords that a tenant is allowed to complain about.
 * Rule: must have a deposit on the room with deposits.status = 'ACCEPTED'
 * and transactions.status = 'SUCCESS'
 */
async function getEligibleTargets(userId) {
  const tenantId = await getTenantId(userId);

  const eligible = await db('deposits')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .join('users', 'deposits.landlord_id', 'users.user_id')
    .join('transactions', 'deposits.deposit_id', 'transactions.deposit_id')
    .where('deposits.tenant_id', tenantId)
    .where('deposits.status', 'ACCEPTED')
    .where('transactions.status', 'SUCCESS')
    .select(
      'rooms.room_id',
      'rooms.title as room_title',
      'rooms.detailed_address as room_address',
      'users.user_id as landlord_id',
      'users.full_name as landlord_name',
      'deposits.deposit_id'
    )
    .distinct('deposits.deposit_id');

  return eligible;
}

module.exports = {
  submitReport,
  getReports,
  getReportDetail,
  getEligibleTargets,
};
