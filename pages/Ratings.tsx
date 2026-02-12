
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { Student, Group, GroupMember, LedgerType } from '../types';
import { Star, Trophy, Award, Trash2, AlertTriangle, Users, Calendar } from 'lucide-react';
import { SyncContext, ToastContext } from '../App';

const Ratings: React.FC = () => {
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<GroupMember[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [period, setPeriod] = useState<'month' | 'lifetime'>('lifetime');

  useEffect(() => {
    const students = db.getStudents().filter(s => s.isActive !== false);
    const ledger = db.getLedger() || [];
    const allRecords = db.getRecords() || [];
    const groupsData = db.getGroups().filter(g => g.isActive !== false);
    const membersData = db.getGroupMembers();

    setGroups(groupsData);
    setMemberships(membersData);

    const currentMonth = new Date().toISOString().substring(0, 7);

    let stats = students.map(s => {
      // 1. Tasdiqlangan ballar (Ledger)
      let studentLedger = ledger.filter(l => l.studentId === s.id && (l.type === LedgerType.ATTENDANCE || l.type === LedgerType.BONUS));
      
      // 2. Kutilayotgan ballar (Hali Ledgerga o'tmagan davomatlar)
      let studentPending = allRecords.filter(r => r.studentId === s.id && r.coinsApplied === false);

      if (period === 'month') {
        studentLedger = studentLedger.filter(l => l.dateTime && l.dateTime.startsWith(currentMonth));
        // Pending records uchun sana tekshiruvi (faqat shu oy)
        // Session sanasini tekshirish uchun sessionni topish kerak
        const sessions = db.getSessions();
        studentPending = studentPending.filter(r => {
           const sess = sessions.find(sess => sess.id === r.sessionId);
           return sess && sess.date.startsWith(currentMonth);
        });
      }

      const ledgerSum = studentLedger.reduce((sum, l) => sum + Number(l.amount || 0), 0);
      const pendingSum = studentPending.reduce((sum, r) => sum + Number(r.coins || 0), 0);
      
      const total = ledgerSum + pendingSum;

      return { ...s, totalCoins: total };
    });

    if (selectedGroupId !== 'all') {
      const studentIdsInGroup = membersData
        .filter(m => m.groupId === selectedGroupId)
        .map(m => m.studentId);
      stats = stats.filter(s => studentIdsInGroup.includes(s.id));
    }

    setLeaderboard(stats.sort((a, b) => b.totalCoins - a.totalCoins));
  }, [version, selectedGroupId, period]);

  const handleResetAllCoins = () => {
    const ledger = db.getLedger() || [];
    const newLedger = ledger.filter(l => l.type === LedgerType.CHARGE);
    db.set(STORAGE_KEYS.COIN_LEDGER, newLedger);
    
    // Davomatlardagi ballarni ham tozalash kerak
    const records = db.getRecords() || [];
    const clearedRecords = records.map(r => ({ ...r, coins: 0, coinsApplied: true }));
    db.set(STORAGE_KEYS.ATTENDANCE_RECORDS, clearedRecords);

    showToast('Barcha ballar nollashtirildi!', 'success');
    setIsResetModalOpen(false);
  };

  const getGroupName = (studentId: string) => {
    const m = memberships.find(mem => mem.studentId === studentId);
    if (!m) return 'Guruhsiz';
    const g = groups.find(group => group.id === m.groupId);
    return g ? g.name : 'Guruhsiz';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reyting va Ballar</h1>
          <p className="text-gray-500">Klubning eng faol o'quvchilari (Real-vaqt)</p>
        </div>
        <button 
          onClick={() => setIsResetModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-100 hover:bg-red-100 transition-all shadow-sm"
        >
          <Trash2 size={16}/> Ballarni nollash
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
           <button 
            onClick={() => setSelectedGroupId('all')}
            className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${selectedGroupId === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             <Users size={16}/> Barchasi
           </button>
           {groups.map(g => (
             <button 
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedGroupId === g.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-gray-500 border-gray-100'}`}
             >
               {g.name}
             </button>
           ))}
        </div>

        <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1 ml-auto">
           <button 
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${period === 'month' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
           >
             Shu oy
           </button>
           <button 
            onClick={() => setPeriod('lifetime')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${period === 'lifetime' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
           >
             Umumiy
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b flex justify-between items-center">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
             {period === 'month' ? 'JORIY OY BO\'YICHA' : 'UMUMIY REYTING'}
           </span>
           <span className="text-[10px] font-bold text-indigo-600 uppercase">{leaderboard.length} TA O'QUVCHI</span>
        </div>
        <div className="divide-y divide-gray-50">
          {leaderboard.map((student, index) => (
            <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <span className={`w-8 font-black text-lg ${index < 3 ? 'text-indigo-600' : 'text-gray-300'}`}>#{index + 1}</span>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-bold text-indigo-600 overflow-hidden border">
                 {student.facePhoto ? <img src={student.facePhoto} className="w-full h-full object-cover" /> : student.ism?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{student.ism} {student.familiya}</p>
                <div className="flex items-center gap-2">
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {student.studentCode}</p>
                   <span className="w-1 h-1 bg-gray-200 rounded-full"/>
                   <p className="text-[10px] text-indigo-500 font-bold uppercase">{getGroupName(student.id)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-gray-900 text-xl">{student.totalCoins}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ball</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="py-20 text-center text-gray-400 italic flex flex-col items-center">
               <Trophy size={48} className="opacity-10 mb-2"/>
               Ma'lumot topilmadi
            </div>
          )}
        </div>
      </div>

      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={40}/>
              </div>
              <h2 className="text-xl font-bold mb-2">Ballarni nollash</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">Diqqat! Barcha o'quvchilarning yig'gan ballari butunlay o'chiriladi. Bu jarayonni ortga qaytarib bo'lmaydi.</p>
              <div className="flex gap-3">
                 <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400">Bekor qilish</button>
                 <button onClick={handleResetAllCoins} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100">Ha, nollash</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Ratings;
