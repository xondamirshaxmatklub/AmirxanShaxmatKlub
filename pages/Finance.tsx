
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { Student, AuthUser, Payment, LedgerType, CoinLedger } from '../types';
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, RefreshCw, Calendar } from 'lucide-react';
import { SyncContext, ToastContext } from '../App';

interface Props { user: AuthUser; }

const Finance: React.FC<Props> = ({ user }) => {
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Faqat isActive: true bo'lgan o'quvchilarni olamiz
    setStudents(db.getStudents().filter(s => s.isActive !== false));
  }, [version]);

  // Avtomatik oylik to'lovni tekshirish (Subscription Logic)
  const checkMonthlyCharges = () => {
    setIsChecking(true);
    const currentStudents = db.getStudents().filter(s => s.isActive !== false && !s.isFrozen);
    const ledger = db.getLedger();
    let updatedLedger = [...ledger];
    let updatedStudents = [...db.getStudents()];
    let changed = false;

    const today = new Date();

    currentStudents.forEach(student => {
      // Oxirgi yechilgan sanani yoki qo'shilgan sanani aniqlaymiz
      const lastDateStr = student.lastChargeDate || student.startDate;
      const lastChargeDate = new Date(lastDateStr);
      
      const diffTime = today.getTime() - lastChargeDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Agar 30 kundan ko'p vaqt o'tgan bo'lsa
      if (diffDays >= 30) {
        const chargeAmount = student.monthlyFee || 300000;
        const newCharge: CoinLedger = {
          id: crypto.randomUUID ? crypto.randomUUID() : 'charge-' + Date.now(),
          studentId: student.id,
          dateTime: today.toISOString(),
          amount: -chargeAmount, // Hisobdan ayriladi
          type: LedgerType.CHARGE,
          note: `Avtomatik oylik yig'im: ${today.toLocaleDateString('uz-UZ', {month: 'long'})}`
        };
        updatedLedger.push(newCharge);
        
        // Student'ning lastChargeDate'sini bugungi kunga yangilash
        updatedStudents = updatedStudents.map(s => s.id === student.id ? { ...s, lastChargeDate: today.toISOString() } : s);
        changed = true;
      }
    });

    if (changed) {
      db.set(STORAGE_KEYS.COIN_LEDGER, updatedLedger);
      db.set(STORAGE_KEYS.STUDENTS, updatedStudents);
      showToast('Oylik yig\'imlar balansdan chegirildi', 'info');
    } else {
      showToast('Hozircha yechiladigan oylik to\'lovlar yo\'q', 'info');
    }
    setIsChecking(false);
  };

  const handlePayment = () => {
    const numAmount = Number(amount);
    if (!selectedStudentId) { showToast('O\'quvchini tanlang', 'error'); return; }
    if (isNaN(numAmount) || numAmount <= 0) { showToast('To\'g\'ri summani kiriting', 'error'); return; }

    const payments = db.getPayments();
    const newPayment: Payment = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'pay-' + Date.now(),
      studentId: selectedStudentId,
      amount: numAmount,
      paidAt: new Date().toISOString()
    };
    db.set(STORAGE_KEYS.PAYMENTS, [...payments, newPayment]);
    
    showToast('To\'lov qabul qilindi', 'success');
    setAmount('');
    setSelectedStudentId('');
    setIsModalOpen(false);
  };

  const getBalance = (studentId: string) => {
    const ledger = db.getLedger().filter(l => l.studentId === studentId && l.type === LedgerType.CHARGE);
    const payments = db.getPayments().filter(p => p.studentId === studentId);
    const totalCharges = ledger.reduce((sum, l) => sum + l.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    return totalPayments + totalCharges;
  };

  const filtered = students.filter(s => `${s.ism} ${s.familiya}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moliya va Balans</h1>
          <p className="text-gray-500">To'lovlar va oylik yig'imlar boshqaruvi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkMonthlyCharges} className="flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-3 rounded-2xl shadow-sm font-bold text-xs hover:bg-indigo-50 transition-colors">
             <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''}/> Yig'imlarni tekshirish
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg font-bold hover:bg-indigo-700 transition-all active:scale-95">
            <Plus size={20}/> To'lov qabul qilish
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Ism bo'yicha qidirish..." className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-100" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered.map(student => {
            const balance = getBalance(student.id);
            return (
              <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className={`p-3 rounded-xl ${balance < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {balance < 0 ? <ArrowDownCircle size={20}/> : <ArrowUpCircle size={20}/>}
                   </div>
                   <div>
                      <p className="font-bold text-gray-900">{student.ism} {student.familiya}</p>
                      <div className="flex items-center gap-2">
                         <p className="text-[10px] text-gray-400 font-black uppercase">ID: {student.studentCode}</p>
                         <span className="w-1 h-1 bg-gray-200 rounded-full"/>
                         <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                            <Calendar size={10}/> {new Date(student.lastChargeDate || student.startDate).toLocaleDateString()}
                         </p>
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <p className={`text-lg font-black ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {balance.toLocaleString()} so'm
                   </p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">Balans</p>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="py-20 text-center text-gray-400 italic">O'quvchilar topilmadi</div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-6">Yangi to'lov qabul qilish</h2>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">O'quvchi</label>
                    <select className="w-full p-3 bg-gray-50 border rounded-xl mt-1 outline-none" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                       <option value="">Tanlang...</option>
                       {students.map(s => <option key={s.id} value={s.id}>{s.ism} {s.familiya}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Summa (so'm)</label>
                    <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl mt-1 font-bold text-indigo-600 outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="300000"/>
                 </div>
                 <div className="flex gap-3 pt-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-400 font-bold">Bekor qilish</button>
                    <button onClick={handlePayment} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700">Saqlash</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
