exports.up = async function (knex) {
  const hasLandlordClearedAt = await knex.schema.hasColumn('conversations', 'landlord_cleared_at');
  const hasTenantClearedAt = await knex.schema.hasColumn('conversations', 'tenant_cleared_at');

  await knex.schema.alterTable('conversations', (table) => {
    if (!hasLandlordClearedAt) {
      table.timestamp('landlord_cleared_at').nullable().defaultTo(null);
    }
    if (!hasTenantClearedAt) {
      table.timestamp('tenant_cleared_at').nullable().defaultTo(null);
    }
  });
};

exports.down = async function (knex) {
  const hasLandlordClearedAt = await knex.schema.hasColumn('conversations', 'landlord_cleared_at');
  const hasTenantClearedAt = await knex.schema.hasColumn('conversations', 'tenant_cleared_at');

  await knex.schema.alterTable('conversations', (table) => {
    if (hasTenantClearedAt) {
      table.dropColumn('tenant_cleared_at');
    }
    if (hasLandlordClearedAt) {
      table.dropColumn('landlord_cleared_at');
    }
  });
};
