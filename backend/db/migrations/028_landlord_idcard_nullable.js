/**
 * Nới NULL cho ảnh CCCD của landlord.
 * - Đăng ký landlord nay chỉ nhận thông tin (không kèm ảnh); ảnh được nộp sau qua
 *   API riêng. Nên 2 cột id_card_*_url phải cho phép NULL = "chưa nộp".
 * - Quan trọng cho assertVerifiedHost (whereNotNull): NULL phản ánh đúng landlord
 *   chưa nộp CCCD, thay vì chuỗi rỗng '' từng bị coi nhầm là đã có ảnh.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('landlords', (table) => {
    table.string('id_card_front_url', 2048).nullable().alter();
    table.string('id_card_back_url', 2048).nullable().alter();
  });

  // Dọn dữ liệu cũ: chuỗi rỗng '' (từ luồng đăng ký cũ) → NULL cho nhất quán.
  await knex('landlords').where({ id_card_front_url: '' }).update({ id_card_front_url: null });
  await knex('landlords').where({ id_card_back_url: '' }).update({ id_card_back_url: null });
};

exports.down = async function (knex) {
  // Backfill NULL → '' trước khi đặt lại NOT NULL để không vỡ ràng buộc.
  await knex('landlords').whereNull('id_card_front_url').update({ id_card_front_url: '' });
  await knex('landlords').whereNull('id_card_back_url').update({ id_card_back_url: '' });

  await knex.schema.alterTable('landlords', (table) => {
    table.string('id_card_front_url', 2048).notNullable().alter();
    table.string('id_card_back_url', 2048).notNullable().alter();
  });
};
