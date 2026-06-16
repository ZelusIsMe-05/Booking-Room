/**
 * Dummy migration to resolve "corrupt migration directory" error.
 * This migration was applied to the database in another environment/branch,
 * but the physical file is missing from this workspace.
 */
exports.up = async function (knex) {
  // Do nothing
};

exports.down = async function (knex) {
  // Do nothing
};
