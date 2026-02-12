
export const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sh', 'Yak'];

export const STORAGE_KEYS = {
  USERS: 'chess_crm_users',
  STUDENTS: 'chess_crm_students',
  GROUPS: 'chess_crm_groups',
  GROUP_MEMBERS: 'chess_crm_group_members',
  ATTENDANCE_SESSIONS: 'chess_crm_attendance_sessions',
  ATTENDANCE_RECORDS: 'chess_crm_attendance_records',
  COIN_LEDGER: 'chess_crm_coin_ledger',
  MONTHLY_SETTINGS: 'chess_crm_monthly_settings',
  ABSENCES: 'chess_crm_absences',
  FREEZES: 'chess_crm_freezes',
  PAYMENTS: 'chess_crm_payments',
  TELEGRAM_PARENTS: 'chess_crm_telegram_parents',
  TELEGRAM_LOGS: 'chess_crm_telegram_logs',
  TELEGRAM_BOT_TOKEN: 'chess_crm_bot_token',
  TELEGRAM_OFFSET: 'chess_crm_bot_offset',
  DELETE_REQUESTS: 'chess_crm_delete_requests',
  AUTH: 'chess_crm_auth_state'
};

export const SEED_USERS = [
  { id: '1', username: 'boshadmin', passwordHash: '123', role: 'BOSH_ADMIN' },
  { id: '2', username: 'admin', passwordHash: '123', role: 'ADMIN' }
];
