/**
 * Table: refresh_tokens (Phiên Refresh Token)
 * Lưu mỗi phiên refresh token để có thể thu hồi khi logout.
 *
 * Mô hình: access token ngắn hạn (stateless) + refresh token có trạng thái.
 * - Login  : INSERT một bản ghi (token_id = jti, lưu token_hash, KHÔNG lưu token thô).
 * - Refresh: tra token_id để xác nhận phiên còn tồn tại + chưa hết hạn.
 * - Logout : DELETE bản ghi (hard-delete) → refresh token cũ không dùng được nữa.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('refresh_tokens', (table) => {
    // token_id chính là `jti` của refresh token, do app sinh (crypto.randomUUID()).
    table.uuid('token_id').notNullable().primary();
    table
      .uuid('user_id')
      .notNullable()
      .references('user_id')
      .inTable('users')
      .onDelete('CASCADE');
    // SHA-256 (hex) của refresh token. Không bao giờ lưu token thô.
    table.string('token_hash', 255).notNullable();
    table.string('user_agent', 512).nullable();
    table.specificType('ip_address', 'inet').nullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id)`,
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens (expires_at)`,
  );
};

exports.down = async function (knex) {
  await knex.raw(`DROP INDEX IF EXISTS refresh_tokens_expires_at_idx`);
  await knex.raw(`DROP INDEX IF EXISTS refresh_tokens_user_id_idx`);
  await knex.schema.dropTableIfExists('refresh_tokens');
};
