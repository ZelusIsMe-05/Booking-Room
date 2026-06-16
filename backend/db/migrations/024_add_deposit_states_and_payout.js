/**
 * Add ACCEPTED and REJECTED states to deposit_status enum.
 * Add decision and payout fields to deposits table.
 */
exports.config = { transaction: false };

exports.up = async function (knex) {
  // PostgreSQL does not allow running ALTER TYPE ADD VALUE inside a transaction block in all cases,
  // so we use transaction: false for this migration.
  await knex.raw("ALTER TYPE deposit_status ADD VALUE IF NOT EXISTS 'ACCEPTED'");
  await knex.raw("ALTER TYPE deposit_status ADD VALUE IF NOT EXISTS 'REJECTED'");

  await knex.schema.alterTable('deposits', (table) => {
    table.timestamp('host_accepted_at').nullable();
    table.timestamp('host_rejected_at').nullable();
    table.timestamp('payout_eligible_at').nullable();
    table.string('payout_status', 50).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('deposits', (table) => {
    table.dropColumn('host_accepted_at');
    table.dropColumn('host_rejected_at');
    table.dropColumn('payout_eligible_at');
    table.dropColumn('payout_status');
  });

  // Note: PostgreSQL does not easily support removing enum values in a down migration safely.
};
