exports.up = async function (knex) {
  await knex.schema.alterTable('support_tickets', (table) => {
    table.text('admin_response').nullable();
  });
  await knex.schema.alterTable('violation_reports', (table) => {
    table.text('admin_response_tenant').nullable();
    table.text('admin_response_landlord').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('support_tickets', (table) => {
    table.dropColumn('admin_response');
  });
  await knex.schema.alterTable('violation_reports', (table) => {
    table.dropColumn('admin_response_tenant');
    table.dropColumn('admin_response_landlord');
  });
};
