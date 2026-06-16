const roomService = require('../services/roomService');
(async () => {
  try {
    const result = await roomService.getRoomById('4fa5fb0d-3e99-4680-85f8-59a02be3a28e');
    console.log('RESULT', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR', err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
