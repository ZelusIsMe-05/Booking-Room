/**
 * Migration 032 — Add parent_reply_id to review_replies table
 * Supports nested replies (threaded comments).
 */

exports.up = async (knex) => {
  const hasColumn = await knex.schema.hasColumn('review_replies', 'parent_reply_id');
  if (!hasColumn) {
    await knex.schema.table('review_replies', (table) => {
      table
        .uuid('parent_reply_id')
        .nullable()
        .references('reply_id')
        .inTable('review_replies')
        .onDelete('CASCADE');
    });
  }
};

exports.down = async (knex) => {
  await knex.schema.table('review_replies', (table) => {
    table.dropColumn('parent_reply_id');
  });
};
