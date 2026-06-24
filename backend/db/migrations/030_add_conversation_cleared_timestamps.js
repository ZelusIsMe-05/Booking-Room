exports.up = async function (knex) {
  await knex.schema.alterTable('conversations', (table) => {
    table.timestamp('landlord_cleared_at').nullable().defaultTo(null);
    table.timestamp('tenant_cleared_at').nullable().defaultTo(null);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('conversations', (table) => {
    table.dropColumn('tenant_cleared_at');
    table.dropColumn('landlord_cleared_at');
  });
};
