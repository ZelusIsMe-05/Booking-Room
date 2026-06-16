const roomService = require('../services/roomService');

(async () => {
  try {
    const res = await roomService.listRooms({});
    console.log('OK:', JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
