const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { writeSystemLog } = require('./systemLogService');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'RESOLVED', 'DISMISSED'];

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Build the base query for violation reports with related info joined.
 */
function baseReportQuery() {
  return db('violation_reports')
    .leftJoin('tenants', 'violation_reports.tenant_id', 'tenants.tenant_id')
    .leftJoin('users as tenant_user', 'tenants.tenant_id', 'tenant_user.user_id')
    .leftJoin('rooms', 'violation_reports.room_id', 'rooms.room_id')
    .leftJoin('room_images', function() {
      this.on('rooms.room_id', 'room_images.room_id').andOnVal('room_images.is_cover', '=', true);
    })
    .leftJoin('landlords', 'violation_reports.landlord_id', 'landlords.landlord_id')
    .leftJoin('users as landlord_user', 'landlords.landlord_id', 'landlord_user.user_id');
}

function selectReportFields(query) {
  return query.select(
    'violation_reports.report_id',
    'violation_reports.room_id',
    'violation_reports.landlord_id',
    'violation_reports.tenant_id',
    'violation_reports.reason',
    'violation_reports.resolution_status',
    'violation_reports.evidence_image_url',
    'violation_reports.created_at',
    // Tenant (reporter) info
    'tenant_user.full_name as tenant_full_name',
    'tenant_user.email as tenant_email',
    'tenant_user.phone_number as tenant_phone_number',
    'tenant_user.avatar_url as tenant_avatar_url',
    // Room info
    'rooms.title as room_title',
    'rooms.detailed_address as room_address',
    'room_images.image_url as room_cover_image_url',
    // Reported landlord info
    'landlord_user.full_name as landlord_full_name',
    'landlord_user.email as landlord_email',
  );
}

function applyFilters(query, filters) {
  if (filters.status) {
    const status = String(filters.status).trim().toUpperCase();
    if (VALID_STATUSES.includes(status)) {
      query.where('violation_reports.resolution_status', status);
    }
  }

  if (filters.priority) {
    // Priority is derived, not stored. Skip DB filter — handle in post-processing if needed.
  }

  if (filters.keyword) {
    const keyword = `%${String(filters.keyword).trim()}%`;
    query.where((builder) => {
      builder
        .whereILike('violation_reports.reason', keyword)
        .orWhereILike('tenant_user.full_name', keyword)
        .orWhereILike('tenant_user.email', keyword)
        .orWhereILike('tenant_user.phone_number', keyword)
        .orWhereILike('rooms.title', keyword);
    });
  }
}

/**
 * Admin: list all violation reports with filters and pagination.
 */
async function listAllReports(filters = {}) {
  const page = parsePositiveInteger(filters.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(filters.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const base = baseReportQuery();
  applyFilters(base, filters);

  const countQuery = base.clone().clearSelect().clearOrder().countDistinct({ total: 'violation_reports.report_id' }).first();
  const rowsQuery = selectReportFields(base.clone())
    .orderByRaw(`
      CASE violation_reports.resolution_status 
        WHEN 'PENDING' THEN 0 
        WHEN 'PROCESSING' THEN 1 
        WHEN 'RESOLVED' THEN 2 
        WHEN 'DISMISSED' THEN 3 
      END ASC,
      violation_reports.created_at DESC
    `)
    .limit(limit)
    .offset(offset);

  const [countRow, rows] = await Promise.all([countQuery, rowsQuery]);
  const total = Number(countRow ? countRow.total : 0);

  return {
    items: rows.map(mapReport),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Admin: get a single violation report detail.
 */
async function getReportDetail(reportId) {
  const report = await selectReportFields(baseReportQuery())
    .where('violation_reports.report_id', reportId)
    .first();

  if (!report) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy báo cáo vi phạm.', 404);
  }

  return mapReport(report);
}

/**
 * Admin: update report status (PENDING → PROCESSING → RESOLVED | DISMISSED).
 */
async function updateReportStatus({ reportId, status, adminResponseTenant, adminResponseLandlord, actor }) {
  const upperStatus = String(status).trim().toUpperCase();
  if (!VALID_STATUSES.includes(upperStatus)) {
    throw new AppError('VALIDATION_ERROR', `Trạng thái không hợp lệ. Phải là: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const existing = await db('violation_reports').where({ report_id: reportId }).first();
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy báo cáo vi phạm.', 404);
  }

  const [updated] = await db('violation_reports')
    .where({ report_id: reportId })
    .update({ resolution_status: upperStatus })
    .returning('*');

  // Log admin action
  await writeSystemLog({
    userId: actor.userId,
    action: `ADMIN_UPDATE_REPORT_STATUS report=${reportId} status=${upperStatus}`,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  const trimmedTenantResponse = adminResponseTenant ? String(adminResponseTenant).trim() : '';
  const trimmedLandlordResponse = adminResponseLandlord ? String(adminResponseLandlord).trim() : '';

  // Only notify when the report is completely resolved or dismissed
  if (upperStatus === 'RESOLVED' || upperStatus === 'DISMISSED') {
    const notificationRepository = require('../../repositories/guest/notificationRepository');
    
    // 1. Notify the reporting tenant
    let tenantTitle = 'Kết quả giải quyết khiếu nại';
    let tenantContent = `Khiếu nại của bạn (Mã: ${reportId.split('-')[0]}) đã được xử lý. `;
    if (upperStatus === 'RESOLVED') {
      tenantContent += 'Cảm ơn bạn đã báo cáo. Chúng tôi đã xác minh vi phạm của chủ phòng và tiến hành xử lý.';
    } else {
      tenantContent += 'Sau khi xác minh, chúng tôi không tìm thấy đủ bằng chứng vi phạm từ phía chủ phòng nên khiếu nại đã bị từ chối.';
    }
    if (trimmedTenantResponse) {
      tenantContent += ` Phản hồi từ quản trị viên: "${trimmedTenantResponse}"`;
    }

    await notificationRepository.insertNotification({
      user_id: existing.tenant_id,
      title: tenantTitle,
      content: tenantContent,
      notification_type: 'VIOLATION',
      status: 'UNREAD',
    });

    // 2. Notify the reported landlord ONLY IF resolved (has guilt)
    if (existing.landlord_id && upperStatus === 'RESOLVED') {
      let landlordTitle = '⚠️ Cảnh báo vi phạm chính sách';
      let landlordContent = '';
      const shortId = reportId.split('-')[0];

      if (existing.room_id) {
         landlordContent = `CẢNH BÁO: Phòng của bạn đã bị tố cáo vi phạm (Mã: ${shortId}) với lý do: "${existing.reason}". Hệ thống xác minh là đúng sự thật. Vui lòng chấn chỉnh lại dịch vụ để tránh bị khóa tài khoản.`;
      } else {
         landlordContent = `CẢNH BÁO: Bạn đã bị khách hàng tố cáo về hành vi: "${existing.reason}" (Mã: ${shortId}). Hệ thống xác minh là đúng sự thật. Vui lòng chấn chỉnh lại hành vi để tránh bị khóa tài khoản.`;
      }
      if (trimmedLandlordResponse) {
        landlordContent += ` Phản hồi từ quản trị viên: "${trimmedLandlordResponse}"`;
      }

      await notificationRepository.insertNotification({
        user_id: existing.landlord_id,
        title: landlordTitle,
        content: landlordContent,
        notification_type: 'VIOLATION',
        status: 'UNREAD',
      });
    }
  } else {
    // For PROCESSING status, still send notification with admin response if provided
    const notificationRepository = require('../../repositories/guest/notificationRepository');
    
    if (trimmedTenantResponse) {
      await notificationRepository.insertNotification({
        user_id: existing.tenant_id,
        title: 'Phản hồi từ quản trị viên về khiếu nại',
        content: `Khiếu nại của bạn (Mã: ${reportId.split('-')[0]}) đã được tiếp nhận. Phản hồi từ quản trị viên: "${trimmedTenantResponse}"`,
        notification_type: 'VIOLATION',
        status: 'UNREAD',
      });
    }

    if (existing.landlord_id && trimmedLandlordResponse) {
      const shortId = reportId.split('-')[0];
      await notificationRepository.insertNotification({
        user_id: existing.landlord_id,
        title: 'Thông báo về yêu cầu làm rõ khiếu nại',
        content: `Bạn nhận được thông báo liên quan đến khiếu nại (Mã: ${shortId}) về lý do: "${existing.reason}". Phản hồi từ quản trị viên: "${trimmedLandlordResponse}"`,
        notification_type: 'VIOLATION',
        status: 'UNREAD',
      });
    }
  }

  return mapReportRow(updated);
}

/**
 * Admin: get summary stats for violation reports.
 */
async function getReportStats() {
  const [pendingCount] = await db('violation_reports').where({ resolution_status: 'PENDING' }).count('report_id as count');
  const [processingCount] = await db('violation_reports').where({ resolution_status: 'PROCESSING' }).count('report_id as count');
  const [resolvedCount] = await db('violation_reports').where({ resolution_status: 'RESOLVED' }).count('report_id as count');
  const [dismissedCount] = await db('violation_reports').where({ resolution_status: 'DISMISSED' }).count('report_id as count');

  return {
    pending: Number(pendingCount.count),
    processing: Number(processingCount.count),
    resolved: Number(resolvedCount.count),
    dismissed: Number(dismissedCount.count),
    total: Number(pendingCount.count) + Number(processingCount.count) + Number(resolvedCount.count) + Number(dismissedCount.count),
  };
}

// ── Mappers ────────────────────────────────────────────────

function mapReport(row) {
  return {
    reportId: row.report_id,
    reason: row.reason,
    resolutionStatus: row.resolution_status,
    evidenceImageUrl: row.evidence_image_url,
    createdAt: row.created_at,
    reporter: {
      tenantId: row.tenant_id,
      fullName: row.tenant_full_name,
      email: row.tenant_email,
      phoneNumber: row.tenant_phone_number,
      avatarUrl: row.tenant_avatar_url,
    },
    room: row.room_id
      ? {
          roomId: row.room_id,
          title: row.room_title,
          address: row.room_address,
          coverImageUrl: row.room_cover_image_url,
        }
      : null,
    reportedLandlord: row.landlord_id
      ? {
          landlordId: row.landlord_id,
          fullName: row.landlord_full_name,
          email: row.landlord_email,
        }
      : null,
  };
}

function mapReportRow(row) {
  return {
    reportId: row.report_id,
    reason: row.reason,
    resolutionStatus: row.resolution_status,
    evidenceImageUrl: row.evidence_image_url,
    createdAt: row.created_at,
    tenantId: row.tenant_id,
    roomId: row.room_id,
    landlordId: row.landlord_id,
  };
}

module.exports = {
  listAllReports,
  getReportDetail,
  updateReportStatus,
  getReportStats,
};
