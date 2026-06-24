/**
 * Add 'HIDDEN' value to the room_status enum.
 *
 * 'HIDDEN' lets a landlord temporarily take a listing off the public market
 * without deleting it. Public queries already filter on status = 'AVAILABLE',
 * so HIDDEN rooms are automatically excluded from search/detail.
 *
 * Note: Postgres does not allow ALTER TYPE ... ADD VALUE inside a transaction,
 * so this migration disables the per-migration transaction (same pattern used
 * by migration 020 when adding 'LOCKED').
 */
exports.config = { transaction: false };

exports.up = async function (knex) {
  await knex.raw(`ALTER TYPE room_status ADD VALUE IF NOT EXISTS 'HIDDEN'`);
};

exports.down = async function () {
  // Postgres does not support removing a value from an enum type safely.
  // Leaving 'HIDDEN' in place on rollback is harmless (no rows reference it
  // once visibility has been toggled back to AVAILABLE). No-op by design.
};
