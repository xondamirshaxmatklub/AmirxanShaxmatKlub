
import { STORAGE_KEYS, SEED_USERS } from './constants';
import { 
  AuthUser, Student, Group, GroupMember, 
  AttendanceSession, AttendanceRecord, CoinLedger, 
  MonthlySettings, Absence, Freeze, Payment, 
  TelegramParent, DeleteRequest 
} from './types';
import { supabase } from './lib/supabase';

type ChangeCallback = (key: string, data: any) => void;
const listeners: ChangeCallback[] = [];

// Supabase'ga ma'lumotlarni yuborish
async function syncToCloud(key: string, data: any) {
  try {
    const { error } = await supabase
      .from('crm_sync')
      .upsert({ 
        key_name: key, 
        data_json: data, 
        updated_at: new Date() 
      }, { onConflict: 'key_name' });
    if (error) console.warn('Supabase sync warning:', error.message);
  } catch (e) {
    console.error('Cloud sync failed', e);
  }
}

// Barcha ma'lumotlarni Supabasedan tortish
async function pullAllFromCloud() {
  try {
    const { data, error } = await supabase
      .from('crm_sync')
      .select('key_name, data_json');
    
    if (error) {
      console.warn('Supabase pull warning:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      data.forEach(item => {
        localStorage.setItem(item.key_name, JSON.stringify(item.data_json));
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Cloud pull failed', e);
    return false;
  }
}

export const db = {
  generateId(): string {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {}
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  },

  get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },
  
  set(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
    syncToCloud(key, value);
    listeners.forEach(cb => cb(key, value));
  },

  onChange(callback: ChangeCallback) {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    };
  },

  async init() {
    // 1. Birinchi LocalStorage bilan ishni boshlaymiz (Instant start)
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }

    // 2. Cloud ma'lumotlarini orqa fonda (background) yuklaymiz
    // Bu white-screen (hang) bo'lib qolishini oldini oladi
    pullAllFromCloud().then(success => {
      if (success) {
        // Ma'lumotlar kelganini barcha komponentlarga bildirish
        listeners.forEach(cb => cb('INIT_CLOUD_SYNC', true));
      }
    });

    // 3. Realtime ulanish
    try {
      supabase
        .channel('crm_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_sync' }, (payload) => {
          if (payload.new) {
            const { key_name, data_json } = payload.new as any;
            if (key_name) {
              localStorage.setItem(key_name, JSON.stringify(data_json));
              listeners.forEach(cb => cb(key_name, data_json));
            }
          }
        })
        .subscribe();
    } catch (e) {
      console.error('Supabase subscription failed');
    }
  },

  getStudents: () => db.get<Student[]>(STORAGE_KEYS.STUDENTS, []),
  getGroups: () => db.get<Group[]>(STORAGE_KEYS.GROUPS, []),
  getGroupMembers: () => db.get<GroupMember[]>(STORAGE_KEYS.GROUP_MEMBERS, []),
  getSessions: () => db.get<AttendanceSession[]>(STORAGE_KEYS.ATTENDANCE_SESSIONS, []),
  getRecords: () => db.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, []),
  getLedger: () => db.get<CoinLedger[]>(STORAGE_KEYS.COIN_LEDGER, []),
  getMonthlySettings: () => db.get<MonthlySettings[]>(STORAGE_KEYS.MONTHLY_SETTINGS, []),
  getAbsences: () => db.get<Absence[]>(STORAGE_KEYS.ABSENCES, []),
  getFreezes: () => db.get<Freeze[]>(STORAGE_KEYS.FREEZES, []),
  getPayments: () => db.get<Payment[]>(STORAGE_KEYS.PAYMENTS, []),
  getTelegramParents: () => db.get<TelegramParent[]>(STORAGE_KEYS.TELEGRAM_PARENTS, []),
  getDeleteRequests: () => db.get<DeleteRequest[]>(STORAGE_KEYS.DELETE_REQUESTS, []),
  getUsers: () => db.get<AuthUser[]>(STORAGE_KEYS.USERS, SEED_USERS as any)
};
