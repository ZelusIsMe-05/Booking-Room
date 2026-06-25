const db = require('../../config/db');

/**
 * Retrieve a list of available rooms to provide as context for the AI.
 * We only select necessary fields to save token usage and avoid sending sensitive info.
 */
async function getAvailableRoomsForAI() {
  return await db('rooms')
    .join('room_approvals', 'rooms.room_id', 'room_approvals.room_id')
    .leftJoin('room_images', function () {
      this.on('rooms.room_id', '=', 'room_images.room_id').andOnVal('room_images.is_cover', '=', true);
    })
    .where('rooms.status', 'AVAILABLE')
    .where('room_approvals.approval_status', 'APPROVED')
    .select(
      'rooms.room_id',
      'rooms.title',
      'rooms.room_description',
      'rooms.monthly_rent',
      'rooms.deposit_amount',
      'rooms.electricity_cost',
      'rooms.water_cost',
      'rooms.internet_cost',
      'rooms.service_fee',
      'rooms.detailed_address',
      'rooms.ward_name',
      'rooms.district_name',
      'rooms.province_name',
      'rooms.room_type',
      'rooms.average_rating',
      'room_images.image_url as cover_image'
    )
    .limit(50); // Limit to 50 rooms to avoid exceeding OpenAI token limits
}

module.exports = {
  getAvailableRoomsForAI
};
