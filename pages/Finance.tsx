
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { Student, AuthUser, Payment, LedgerType, CoinLedger } from '../types';
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, RefreshCw, Calendar, Edit3, Trash2, History, X, AlertTriangle, Clock } from 'lucide-react';
import { SyncContext, ToastContext } from '../App';

interface Props { user: AuthUser; }

const Finance: React.FC<Props> = ({ user }) => {
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'balance' | 'history'>('balance');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    refreshData();
    autoCheckMonthlyCharges();
  }, [version]);

  const refreshData = () => {
    setStudents(db.getStudents().filter(s => s.isActive !== false));
    setPayments(db.getPayments().sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()));
  };

  const autoCheckMonthlyCharges = () => {
    const currentStudents = db.getStudents().filter(s => s.isActive !== false && !s.isFrozen);
    const ledger = db.getLedger();
    let updatedLedger = [...ledger];
    let updatedStudents = [...db.getStudents()];
    let changed = false;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    currentStudents.forEach(student => {
      let currentLastCharge = student.lastChargeDate;
      let nextChargeDate;
      
      // MUHIM: Birinchi yig'im startDate'dan 30 kun o'tgach amalga oshiriladi
      // Ya'ni 12.01 da kelsa, birinchi minus 11.02 da yoziladi
      if (!currentLastCharge) {
        nextChargeDate = new Date(student.startDate);
        nextChargeDate.setDate(nextChargeDate.getDate() + 30);
      } else {
        nextChargeDate = new Date(currentLastCharge);
        nextChargeDate.setDate(nextChargeDate.getDate() + 30);
      }

      // Agar bugungi sana keyingi to'lov sanasidan o'tib ketgan bo'lsa, minus yozish
      while (nextChargeDate <= today) {
        const chargeAmount = student.monthlyFee || 0;
        if (chargeAmount > 0) {
          const newCharge: CoinLedger = {
            id: db.generateId(),
            studentId: student.id,
            dateTime: nextChargeDate.toISOString(),
            amount: -chargeAmount,
            type: LedgerType.CHARGE,
            note: `Oylik yig'im (${nextChargeDate.toLocaleDateString('uz-UZ', {month: 'long', year: 'numeric'})})`
          };
          updatedLedger.push(newCharge);
          currentLastCharge = nextChargeDate.toISOString();
          
          // Keyingi 30 kunlik siklni hisoblash
          nextChargeDate = new Date(nextChargeDate);
          nextChargeDate.setDate(nextChargeDate.getDate() + 30);
          changed = true;
        } else {
            break; 
        }
      }

      if (changed) {
        updatedStudents = updatedStudents.map(s => s.id === student.id ? { ...s, lastChargeDate: currentLastCharge } : s);
      }
    });

    if (changed) {
      db.set(STORAGE_KEYS.COIN_LEDGER, updatedLedger);
      db.set(STORAGE_KEYS.STUDENTS, updatedStudents);
      refreshData();
    }
  };

  const getNextChargeDate = (student: Student) => {
    const lastDate = student.lastChargeDate || student.startDate;
    const date = new Date(lastDate);
    // Keyingi to'lov sanasi har doim startDate yoki lastChargeDate + 30 kun
    date.setDate(date.getDate() + 30);
    return date;
  };

  const getBalance = (studentId: string) => {
    const ledger = db.getLedger().filter(l => l.studentId === studentId && l.type === LedgerType.CHARGE);
    const studentPayments = db.getPayments().filter(p => p.studentId === studentId);
    const totalCharges = ledger.reduce((sum, l) => sum + l.amount, 0);
    const totalPayments = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    return totalPayments + totalCharges;
  };

  const handleSavePayment = () => {
    const numAmount = Number(amount);
    if (!selectedStudentId) { showToast('O\'quvchini tanlang', 'error'); return; }
    if (isNaN(numAmount) || numAmount <= 0) { showToast('To\'g\'ri summani kiriting', 'error'); return; }

    const allPayments = db.getPayments();
    let updatedPayments;

    if (editingPayment) {
      updatedPayments = allPayments.map(p => p.id === editingPayment.id ? {
        ...p,
        studentId: selectedStudentId,
        amount: numAmount,
        paidAt: paymentDate + 'T' + new Date().toISOString().split('T')[1]
      } : p);
    } else {
      const newPayment: Payment = {
        id: db.generateId(),
        studentId: selectedStudentId,
        amount: numAmount,
        paidAt: paymentDate + 'T' + new Date().toISOString().split('T')[1]
      };
      updatedPayments = [...allPayments, newPayment];
    }

    db.set(STORAGE_KEYS.PAYMENTS, updatedPayments);
    setIsModalOpen(false);
    showToast('To\'lov saqlandi', 'success');
    refreshData();
  };

  const handleDeletePayment = () => {
    if (!paymentToDelete) return;
    const allPayments = db.getPayments();
    const updated = allPayments.filter(p => p.id !== paymentToDelete.id);
    db.set(STORAGE_KEYS.PAYMENTS, updated);
    setIsDeleteModalOpen(false);
    setPaymentToDelete(null);
    showToast('To\'lov o\'chirildi', 'info');
    refreshData();
  };

  // SARALASH: To'lov sanasi yaqin o'quvchilar eng tepada
  const sortedStudents = [...students].sort((a, b) => {
    const dateA = getNextChargeDate(a).getTime();
    const dateB = getNextChargeDate(b).getTime();
    return dateA - dateB;
  });

  const filteredStudents = sortedStudents.filter(s => 
    `${s.ism} ${s.familiya}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = payments.filter(p => {
    const s = students.find(st => st.id === p.studentId);
    return s && `${s.ism} ${s.familiya}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moliya boshqaruvi</h1>
          <p className="text-gray-500">To'lov muddati yaqinlar ro'yxat boshida (30 kunlik sikl)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setIsChecking(true); autoCheckMonthlyCharges(); setTimeout(() => setIsChecking(false), 500); }} className="flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-3 rounded-2xl shadow-sm font-bold text-xs hover:bg-indigo-50 transition-colors">
             <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''}/> Yangilash
          </button>
          <button onClick={() => { setEditingPayment(null); setSelectedStudentId(''); setAmount(''); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg font-bold hover:bg-indigo-700 transition-all active:scale-95">
            <Plus size={20}/> To'lov qabul qilish
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        <button onClick={() => setView('balance')} className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${view === 'balance' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>
           <ArrowUpCircle size={16}/> Balanslar
        </button>
        <button onClick={() => setView('history')} className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${view === 'history' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>
           <History size={16}/> Tarix
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Ism bo'yicha qidirish..." className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-100" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {view === 'balance' ? (
          <div className="divide-y divide-gray-50">
            {filteredStudents.map(student => {
              const balance = getBalance(student.id);
              const nextCharge = getNextChargeDate(student);
              const daysLeft = Math.ceil((nextCharge.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = balance < 0;

              return (
                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isOverdue ? <ArrowDownCircle size={20}/> : <ArrowUpCircle size={20}/>}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">{student.ism} {student.familiya}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Oylik: {student.monthlyFee?.toLocaleString()} so'm</p>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"/>
                           <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${daysLeft <= 3 ? 'text-red-500' : 'text-indigo-400'}`}>
                              <Clock size={10}/> {nextCharge.toLocaleDateString()} {daysLeft > 0 ? `(${daysLeft} kun qoldi)` : '(Bugun)'}
                           </p>
                        </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                        {balance.toLocaleString()} so'm
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Joriy balans</p>
                  </div>
                </div>
              );
            })}
            {filteredStudents.length === 0 && <div className="py-20 text-center text-gray-400 italic">O'quvchilar topilmadi</div>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredHistory.map(payment => {
              const s = students.find(st => st.id === payment.studentId);
              return (
                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar size={20}/></div>
                    <div>
                       <p className="font-bold text-gray-900">{s ? `${s.ism} ${s.familiya}` : 'O\'chirilgan'}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(payment.paidAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-md font-black text-emerald-600">+{payment.amount.toLocaleString()} so'm</p>
                    <div className="flex gap-1">
                       <button onClick={() => { setEditingPayment(payment); setSelectedStudentId(payment.studentId); setAmount(payment.amount.toString()); setPaymentDate(payment.paidAt.split('T')[0]); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-amber-600"><Edit3 size={18}/></button>
                       <button onClick={() => { setPaymentToDelete(payment); setIsDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-indigo-50/20">
                 <h2 className="text-xl font-bold">{editingPayment ? 'Tahrirlash' : 'To\'lov qabul qilish'}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={24}/></button>
              </div>
              <div className="p-6 space-y-4">
                 <select className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} disabled={!!editingPayment}>
                    <option value="">O'quvchini tanlang...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.ism} {s.familiya}</option>)}
                 </select>
                 <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-lg" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Summa (so'm)"/>
                 <input type="date" className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                 <button onClick={handleSavePayment} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">Saqlash</button>
              </div>
           </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={40}/></div>
              <h2 className="text-xl font-bold mb-2">O'chirish</h2>
              <p className="text-sm text-gray-500 mb-6">Ushbu to'lovni o'chirish o'quvchi balansiga ta'sir qiladi. Ishonchingiz komilmi?</p>
              <div className="flex gap-3">
                 <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400">Bekor</button>
                 <button onClick={handleDeletePayment} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold">O'chirish</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
