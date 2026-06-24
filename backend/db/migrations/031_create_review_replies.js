/**
 * Migration 031 — Create review_replies table
 *
 * Stores threaded replies to reviews.
 * Any authenticated user (TENANT or LANDLORD) can reply.
 */

exports.up = async (knex) => {
  const hasTable = await knex.schema.hasTable('review_replies');
  if (!hasTable) {
    await knex.schema.createTable('review_replies', (table) => {
      table
        .uuid('reply_id')
        .notNullable()
        .primary()
        .defaultTo(knex.raw('gen_random_uuid()'));

      // Parent review
      table
        .uuid('review_id')
        .notNullable()
        .references('review_id')
        .inTable('reviews')
        .onDelete('CASCADE');

      // Author (any user: tenant or landlord)
      table
        .uuid('author_id')
        .notNullable()
        .references('user_id')
        .inTable('users')
        .onDelete('CASCADE');

      table.text('content').notNullable();

      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Index for fast lookup of replies per review
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS review_replies_review_id_idx ON review_replies (review_id, created_at)'
  );
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS review_replies_review_id_idx');
  await knex.schema.dropTableIfExists('review_replies');
};
