const env = require('./config/env');

/**
 * Knex configuration for migrations and seeds.
 * Connection string comes from DATABASE_URL (see config/env.js).
 */
module.exports = {
  client: 'pg',
  connection: env.databaseUrl,
  migrations: {
    directory: './db/migrations',
  },
  seeds: {
    directory: './db/seeds',
  },
  pool: {
    min: 0,
    max: Number(process.env.DB_POOL_MAX || 10),
  },
};
