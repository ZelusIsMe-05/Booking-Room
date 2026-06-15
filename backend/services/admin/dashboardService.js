const db = require('../../config/db');

async function safeCount(tableName, columnName = '*') {
  const row = await db(tableName).count({ total: columnName }).first();
  return Number(row ? row.total : 0);
}

async function countPendingRooms() {
  const row = await db('room_approvals')
    .where({ approval_status: 'PENDING' })
    .count({ total: '*' })
    .first();

  return Number(row ? row.total : 0);
}

async function countDailyTransactions() {
  const row = await db('transactions')
    .where('created_at', '>=', db.raw("CURRENT_DATE"))
    .count({ total: '*' })
    .sum({ amount: 'amount' })
    .first();

  return {
    total: Number(row ? row.total : 0),
    amount: Number(row && row.amount ? row.amount : 0),
  };
}

async function getOverview() {
  const [
    totalUsers,
    totalRooms,
    pendingRooms,
    totalTransactions,
    dailyTransactions,
    supportTickets,
    violationReports,
    systemLogs,
  ] = await Promise.all([
    safeCount('users'),
    safeCount('rooms'),
    countPendingRooms(),
    safeCount('transactions'),
    countDailyTransactions(),
    safeCount('support_tickets'),
    safeCount('violation_reports'),
    safeCount('system_logs'),
  ]);

  return {
    users: {
      total: totalUsers,
    },
    rooms: {
      total: totalRooms,
      pendingApproval: pendingRooms,
    },
    transactions: {
      total: totalTransactions,
      today: dailyTransactions.total,
      todayAmount: dailyTransactions.amount,
    },
    support: {
      totalTickets: supportTickets,
      totalViolationReports: violationReports,
    },
    logs: {
      total: systemLogs,
    },
  };
}

module.exports = {
  getOverview,
};
