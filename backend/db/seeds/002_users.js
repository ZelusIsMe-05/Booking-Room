/**
 * Seed: users + their 1:1 specializations (landlords, tenants).
 * Seed password for all users: Password@123
 */
const PWD = '$2b$10$eBd2QbbMg9MHou9H/3YQJeX41vYPgoEeo9WdIAd.dqsGSu8FwIjFG';

exports.seed = async function (knex) {
  await knex('users').insert([
    {
      user_id: 'c0000000-0000-0000-0000-000000000001',
      full_name: 'System Admin',
      email: 'admin@booking.local',
      phone_number: '0900000001',
      gender: 'OTHER',
      date_of_birth: '1990-01-01',
      username: 'admin',
      password: PWD,
      status: 'ACTIVE',
      role_id: 'a0000000-0000-0000-0000-000000000001',
    },
    {
      user_id: 'c0000000-0000-0000-0000-000000000002',
      full_name: 'Nguyen Van Chu',
      email: 'landlord1@booking.local',
      phone_number: '0900000002',
      gender: 'MALE',
      date_of_birth: '1985-05-20',
      address: '12 Le Loi, Q1, HCM',
      username: 'landlord1',
      password: PWD,
      status: 'ACTIVE',
      role_id: 'a0000000-0000-0000-0000-000000000002',
    },
    {
      user_id: 'c0000000-0000-0000-0000-000000000003',
      full_name: 'Tran Thi Chu',
      email: 'landlord2@booking.local',
      phone_number: '0900000003',
      gender: 'FEMALE',
      date_of_birth: '1988-09-12',
      username: 'landlord2',
      password: PWD,
      status: 'ACTIVE',
      role_id: 'a0000000-0000-0000-0000-000000000002',
    },
    {
      user_id: 'c0000000-0000-0000-0000-000000000004',
      full_name: 'Le Van Khach',
      email: 'tenant1@booking.local',
      phone_number: '0900000004',
      gender: 'MALE',
      date_of_birth: '2000-03-15',
      username: 'tenant1',
      password: PWD,
      status: 'ACTIVE',
      role_id: 'a0000000-0000-0000-0000-000000000003',
    },
    {
      user_id: 'c0000000-0000-0000-0000-000000000005',
      full_name: 'Pham Thi Khach',
      email: 'tenant2@booking.local',
      phone_number: '0900000005',
      gender: 'FEMALE',
      date_of_birth: '2001-11-02',
      username: 'tenant2',
      password: PWD,
      status: 'ACTIVE',
      role_id: 'a0000000-0000-0000-0000-000000000003',
    },
  ]);

  await knex('landlords').insert([
    {
      landlord_id: 'c0000000-0000-0000-0000-000000000002',
      id_card_front_url: 'https://cdn.booking.local/cccd/landlord1_front.jpg',
      id_card_back_url: 'https://cdn.booking.local/cccd/landlord1_back.jpg',
      approval_status: 'APPROVED',
    },
    {
      landlord_id: 'c0000000-0000-0000-0000-000000000003',
      id_card_front_url: 'https://cdn.booking.local/cccd/landlord2_front.jpg',
      id_card_back_url: 'https://cdn.booking.local/cccd/landlord2_back.jpg',
      approval_status: 'APPROVED',
    },
  ]);

  await knex('tenants').insert([
    { tenant_id: 'c0000000-0000-0000-0000-000000000004' },
    { tenant_id: 'c0000000-0000-0000-0000-000000000005' },
  ]);
};
