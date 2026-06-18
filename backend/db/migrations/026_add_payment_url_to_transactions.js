exports.up = async function (knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.text('payment_url').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('payment_url');
  });
};
