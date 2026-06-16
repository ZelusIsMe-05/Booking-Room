const db = require('../config/db');

async function countByRoomId(roomId, trx) {
  const conn = trx || db;
  const [{ count }] = await conn('deposits').where('room_id', roomId).count({ count: '*' });
  return Number(count) || 0;
}

module.exports = {
  countByRoomId,
};
