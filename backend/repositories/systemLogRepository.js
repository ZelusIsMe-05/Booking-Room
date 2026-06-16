const db = require('../config/db');

async function insertLog(data, trx) {
  const conn = trx || db;
  const [log] = await conn('system_logs')
    .insert(data)
    .returning('*');
  return log;
}

module.exports = {
  insertLog
};
