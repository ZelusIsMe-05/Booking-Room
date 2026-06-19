require('dotenv').config();
const db = require('./config/db');

async function clean() {
  await db('room_images').del();
  console.log('Cleared all room images.');
  process.exit(0);
}
clean();
