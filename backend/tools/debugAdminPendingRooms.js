const db = require('../config/db');
const roomRepository = require('../repositories/roomRepository');
const adminRoomService = require('../services/admin/roomService');

(async () => {
  try {
    console.log('\n=== Test Repository ===');
    const pending = await roomRepository.findPendingRooms({ page: 1, limit: 20 });
    console.log('findPendingRooms result:', JSON.stringify(pending, null, 2));

    const count = await roomRepository.countPendingRooms();
    console.log('countPendingRooms result:', count);

    console.log('\n=== Test Service ===');
    const result = await adminRoomService.listPendingRooms({ page: 1, limit: 20 });
    console.log('listPendingRooms result:', JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
