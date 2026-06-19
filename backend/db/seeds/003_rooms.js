/**
 * Seed: rooms + room_images.
 */
exports.seed = async function (knex) {
  await knex('rooms').insert([
    {
      room_id: 'd0000000-0000-0000-0000-000000000001',
      landlord_id: 'c0000000-0000-0000-0000-000000000002',
      title: 'Phòng trọ gần Đại học Bách Khoa',
      room_type: 'Room',
      detailed_address: '45 Tô Hiến Thành, Q10, HCM',
      max_capacity: 2,
      monthly_rent: 3500000,
      deposit_amount: 3500000,
      electricity_cost: 3500,
      water_cost: 20000,
      internet_cost: 100000,
      service_fee: 50000,
      status: 'AVAILABLE',
      average_rating: 4.5,
      room_description: 'Phòng thoáng mát, có gác lửng, an ninh tốt.',
      longitude: 106.6667,
      latitude: 10.7722,
    },
    {
      room_id: 'd0000000-0000-0000-0000-000000000002',
      landlord_id: 'c0000000-0000-0000-0000-000000000003',
      title: 'Căn hộ mini full nội thất',
      room_type: 'Apartment',
      detailed_address: '88 Nguyễn Trãi, Q5, HCM',
      max_capacity: 3,
      monthly_rent: 6500000,
      deposit_amount: 6500000,
      electricity_cost: 3800,
      water_cost: 25000,
      internet_cost: 150000,
      service_fee: 100000,
      status: 'RENTED',
      average_rating: 4.0,
      room_description: 'Căn hộ mới, đầy đủ máy lạnh, máy giặt, bếp.',
      longitude: 106.6789,
      latitude: 10.7546,
    },
  ]);
};
