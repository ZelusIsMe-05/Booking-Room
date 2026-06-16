/**
 * Table: oauth_accounts (Tài khoản đăng nhập mạng xã hội)
 * Lưu danh tính OAuth (Google/Facebook/GitHub) liên kết tới một user.
 *
 * Mô hình additive: `users` giữ nguyên (vẫn có username/password cho local login),
 * bảng này chỉ chứa liên kết provider. Một user có thể liên kết nhiều provider
 * (mỗi provider 1 dòng). Khóa định danh: (provider, provider_user_id).
 *
 * Lưu ý: nhánh `thai` đang lệch ledger migration (thiếu 021/022) nên file này có thể
 * được áp trực tiếp như 023 (chạy up(knex) + chèn dòng ledger) thay vì `npm run migrate`.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('oauth_accounts', (table) => {
    table.uuid('oauth_account_id').notNullable().primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('user_id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .enu('provider', ['GOOGLE', 'FACEBOOK', 'GITHUB'], {
        useNative: true,
        enumName: 'oauth_provider',
      })
      .notNullable();
    // ID của user phía provider (Google `sub`, Facebook/GitHub `id`).
    table.string('provider_user_id', 255).notNullable();
    // Email tại provider — lưu để tham khảo/đối soát, không phải nguồn chân lý.
    table.string('email', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Một danh tính provider chỉ map tới đúng một user.
    table.unique(['provider', 'provider_user_id']);
    // Một user chỉ liên kết một tài khoản cho mỗi provider.
    table.unique(['user_id', 'provider']);
  });

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON oauth_accounts (user_id)`,
  );
};

exports.down = async function (knex) {
  await knex.raw(`DROP INDEX IF EXISTS oauth_accounts_user_id_idx`);
  await knex.schema.dropTableIfExists('oauth_accounts');
  await knex.raw('DROP TYPE IF EXISTS oauth_provider');
};
