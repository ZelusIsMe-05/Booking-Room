/**
 * Bổ sung trạng thái duyệt cho landlords.
 * - Landlord đăng ký xong (đã verify OTP) vẫn ở `PENDING` cho tới khi Admin duyệt.
 * - Landlord cũ (đã tồn tại trước migration) được backfill `APPROVED` để không bị khóa nhầm.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('landlords', (table) => {
    table
      .enu('approval_status', ['PENDING', 'APPROVED', 'REJECTED'], {
        useNative: true,
        enumName: 'landlord_approval_status',
      })
      .notNullable()
      .defaultTo('PENDING');
    table.string('rejection_reason', 500).nullable();
    table.timestamp('reviewed_at').nullable();
    table.uuid('reviewed_by').nullable().references('user_id').inTable('users').onDelete('SET NULL');
  });

  // Backfill: mọi landlord đã tồn tại trước khi có cột này coi như đã được duyệt.
  await knex('landlords').update({ approval_status: 'APPROVED' });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('landlords', (table) => {
    table.dropColumn('reviewed_by');
    table.dropColumn('reviewed_at');
    table.dropColumn('rejection_reason');
    table.dropColumn('approval_status');
  });
  await knex.raw('DROP TYPE IF EXISTS landlord_approval_status');
};
