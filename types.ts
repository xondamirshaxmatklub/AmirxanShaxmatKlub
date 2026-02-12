
export enum UserRole {
  BOSH_ADMIN = 'BOSH_ADMIN',
  ADMIN = 'ADMIN'
}

export interface AuthUser {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
}

export interface Student {
  id: string;
  studentCode: string;
  ism: string;
  familiya: string;
  startDate: string;
  monthlyFee: number;
  lastChargeDate?: string; // Oxirgi oylik to'lov yechilgan sana
  studentPhone?: string;
  address?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  isActive: boolean;
  facePhoto?: string; // base64
  faceUpdatedAt?: string;
  isFrozen?: boolean;
}

export interface Group {
  id: string;
  name: string;
  weekdays: string[];
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface GroupMember {
  id: string;
  groupId: string;
  studentId: string;
}

export enum AttendanceStatus {
  KELDI = 'KELDI',
  KECHIKDI = 'KECHIKDI',
  KELMADI = 'KELMADI'
}

export enum AbsenceType {
  SABABLI = 'SABABLI',
  SABABSIZ = 'SABABSIZ'
}

export interface AttendanceSession {
  id: string;
  groupId: string;
  date: string;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  checkInTime?: string;
  absenceType?: AbsenceType;
  absenceReason?: string;
  coins: number;
  coinsApplied: boolean;
}

export enum LedgerType {
  ATTENDANCE = 'ATTENDANCE',
  BONUS = 'BONUS',
  CHARGE = 'CHARGE'
}

export interface CoinLedger {
  id: string;
  studentId: string;
  dateTime: string;
  amount: number;
  type: LedgerType;
  refId?: string;
  note?: string;
}

export interface MonthlySettings {
  yearMonth: string;
  plannedLessonsCount: number;
}

export interface Absence {
  id: string;
  studentId: string;
  groupId: string;
  sessionId: string;
  date: string;
  absenceType: AbsenceType;
  reason?: string;
  status: 'OPEN' | 'DONE';
}

export interface Freeze {
  id: string;
  studentId: string;
  groupId: string;
  freezeFrom: string;
  freezeTo?: string;
  status: 'FROZEN' | 'UNFROZEN';
  frozenLessonsCount: number;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  paidAt: string;
}

export interface TelegramParent {
  id: string;
  studentId: string;
  chatId: string;
  parentName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TelegramLog {
  id: string;
  time: string;
  chatId: string;
  studentId?: string;
  type: 'CHECKIN' | 'KELMADI' | 'BROADCAST' | 'SYSTEM';
  status: 'OK' | 'FAIL';
  message: string;
  error?: string;
}

export interface DeleteRequest {
  id: string;
  entityType: 'student' | 'group' | 'payment';
  entityId: string;
  requestedBy: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
