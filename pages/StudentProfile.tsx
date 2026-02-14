
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { Student, AttendanceRecord, CoinLedger, LedgerType, UserRole, AttendanceStatus, AttendanceSession } from '../types';
import { ArrowLeft, Camera, Phone, MapPin, Calendar, Star, Wallet, CheckCircle2, XCircle, Clock, Plus, Award, ChevronDown, ChevronRight, History } from 'lucide-react';
import { ToastContext, SyncContext } from '../App';

const StudentProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [ledger, setLedger] = useState<CoinLedger[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(new Date().toISOString().substring(0, 7));
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) || '{}');

  useEffect(() => {
    const s = db.getStudents().find(st => st.id === id);
    if (s) {
      setStudent(s);
      setAttendance((db.getRecords() || []).filter(r => r.studentId === s.id));
      setLedger((db.getLedger() || []).filter(l => l.studentId === s.id));
      setSessions(db.getSessions() || []);
    }
  }, [id, version]);

  const ledgerTotal = ledger
    .filter(l => l.type === LedgerType.ATTENDANCE || l.type === LedgerType.BONUS)
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const pendingTotal = attendance
    .filter(r => r.coinsApplied === false)
    .reduce((sum, r) => sum + Number(r.coins || 0), 0);

  const totalCoins = ledgerTotal + pendingTotal;

  const payments = (db.getPayments() || []).filter(p => p.studentId === id);
  const paymentsTotal = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const charges = ledger.filter(l => l.studentId === id && l.type === LedgerType.CHARGE).reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const balance = paymentsTotal + charges;

  // Oxirgi 6 oylik statistikani tayyorlash
  const getArchiveMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const m = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push(m.toISOString().substring(0, 7));
    }
    return months;
  };

  const getMonthStats = (month: string) => {
    const monthAttendance = attendance.filter(r => {
      const sess = sessions.find(s => s.id === r.sessionId);
      return sess && sess.date.startsWith(month);
    });
    
    const monthPayments = payments.filter(p => p.paidAt.startsWith(month));
    const monthCharges = ledger.filter(l => l.type === LedgerType.CHARGE && l.dateTime.startsWith(month));
    
    return {
      keldi: monthAttendance.filter(r => r.status === AttendanceStatus.KELDI).length,
      kelmadi: monthAttendance.filter(r => r.status === AttendanceStatus.KELMADI).length,
      kechikdi: monthAttendance.filter(r => r.status === AttendanceStatus.KECHIKDI).length,
      payments: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      charges: monthCharges.reduce((sum, c) => sum + Math.abs(c.amount), 0),
      paymentRecords: monthPayments,
      attendanceRecords: monthAttendance
    };
  };

  const handleAddBonus = () => {
    if (currentUser.role !== UserRole.BOSH_ADMIN) {
      showToast('Sizda ruxsat yo\'q!', 'error');
      return;
    }
    const amount = Number(bonusAmount);
    if (!amount || amount <= 0) { 
      showToast('Noldan katta son kiriting', 'error'); 
      return; 
    }
    
    const allLedger = db.getLedger() || [];
    const newEntry: CoinLedger = {
      id: db.generateId(),
      studentId: id!,
      dateTime: new Date().toISOString(),
      amount: amount,
      type: LedgerType.BONUS,
      note: bonusNote.trim() || 'Bonus'
    };
    
    db.set(STORAGE_KEYS.COIN_LEDGER, [...allLedger, newEntry]);
    showToast(`${amount} ball qo'shildi!`, 'success');
    setIsBonusModalOpen(false);
    setBonusAmount('');
    setBonusNote('');
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      showToast('Kameraga ruxsat yo\'q', 'error');
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !student) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const photo = canvas.toDataURL('image/jpeg');

    const updated = db.getStudents().map(s => s.id === student.id ? { ...s, facePhoto: photo } : s);
    db.set(STORAGE_KEYS.STUDENTS, updated);
    setStudent({ ...student, facePhoto: photo });
    (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
    showToast('FaceID yangilandi', 'success');
  };

  if (!student) return <div className="p-10 text-center text-gray-500 italic">O'quvchi topilmadi</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
         <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 font-bold hover:text-indigo-600 transition-colors">
           <ArrowLeft size={20} /> Orqaga
         </button>
         
         <div className="flex gap-2">
            {currentUser.role === UserRole.BOSH_ADMIN && (
                <button onClick={() => setIsBonusModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg"><Award size={18}/> Bonus ball</button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-32 h-32 bg-indigo-50 rounded-3xl flex items-center justify-center font-black text-4xl text-indigo-200 overflow-hidden border-4 border-white shadow-xl">
                {student.facePhoto ? <img src={student.facePhoto} className="w-full h-full object-cover" /> : student.ism?.[0]}
              </div>
              <button onClick={startCamera} className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white"><Camera size={18} /></button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-6">{student.ism} {student.familiya}</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">ID: {student.studentCode}</p>

            <div className="w-full grid grid-cols-2 gap-3 mt-8">
              <div className="p-4 bg-gray-50 rounded-2xl text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Jami Ballar</p>
                <p className="text-xl font-black text-indigo-600">{totalCoins}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Balans</p>
                <p className={`text-xl font-black ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{balance.toLocaleString()} so'm</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
             <h3 className="font-black text-xs uppercase text-indigo-400 tracking-widest">Ma'lumotlar</h3>
             <div className="flex items-center gap-3 text-sm"><div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Phone size={16}/></div><span className="font-bold text-gray-700">{student.studentPhone || '---'}</span></div>
             <div className="flex items-center gap-3 text-sm"><div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Calendar size={16}/></div><span className="font-bold text-gray-700">Oylik: {student.monthlyFee?.toLocaleString()} so'm</span></div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/30">
                <h3 className="font-bold flex items-center gap-2 text-gray-900"><History size={18} className="text-indigo-600"/> O'quvchi Arxivi (Oxirgi 6 oy)</h3>
              </div>
              
              <div className="divide-y divide-gray-50 overflow-y-auto max-h-[600px] no-scrollbar">
                {getArchiveMonths().map(month => {
                  const stats = getMonthStats(month);
                  const isOpen = expandedMonth === month;
                  const monthName = new Date(month + '-01').toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
                  
                  return (
                    <div key={month} className="bg-white">
                      <button 
                        onClick={() => setExpandedMonth(isOpen ? null : month)}
                        className={`w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors ${isOpen ? 'bg-indigo-50/20' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                              <Calendar size={18}/>
                           </div>
                           <div className="text-left">
                              <p className="font-bold text-gray-900 capitalize">{monthName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{stats.keldi} Kelgan</span>
                                 <span className="w-1 h-1 bg-gray-200 rounded-full"/>
                                 <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{stats.kelmadi} Kelmagan</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right hidden sm:block">
                              <p className="text-xs font-black text-emerald-600">+{stats.payments.toLocaleString()} so'm</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Kirish</p>
                           </div>
                           {isOpen ? <ChevronDown size={20} className="text-gray-400"/> : <ChevronRight size={20} className="text-gray-400"/>}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-5 bg-gray-50/50 border-t border-gray-100 space-y-6 animate-in slide-in-from-top-2">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                 <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2"><Wallet size={12}/> To'lovlar</h4>
                                 <div className="space-y-2">
                                    {stats.paymentRecords.length > 0 ? stats.paymentRecords.map(p => (
                                      <div key={p.id} className="flex justify-between text-xs">
                                         <span className="text-gray-500">{new Date(p.paidAt).toLocaleDateString()}</span>
                                         <span className="font-bold text-emerald-600">{p.amount.toLocaleString()} so'm</span>
                                      </div>
                                    )) : <p className="text-[10px] text-gray-400 italic">To'lovlar yo'q</p>}
                                 </div>
                              </div>
                              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                 <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2"><History size={12}/> Davomat</h4>
                                 <div className="space-y-2">
                                    {stats.attendanceRecords.length > 0 ? stats.attendanceRecords.map(r => {
                                      const sess = sessions.find(s => s.id === r.sessionId);
                                      return (
                                        <div key={r.id} className="flex justify-between text-xs">
                                           <span className="text-gray-500">{sess?.date || '---'}</span>
                                           <span className={`font-bold ${r.status === AttendanceStatus.KELDI ? 'text-emerald-600' : r.status === AttendanceStatus.KECHIKDI ? 'text-amber-500' : 'text-red-500'}`}>{r.status}</span>
                                        </div>
                                      );
                                    }) : <p className="text-[10px] text-gray-400 italic">Davomat yo'q</p>}
                                 </div>
                              </div>
                           </div>
                           
                           {stats.charges > 0 && (
                             <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex justify-between items-center">
                                <span className="text-xs font-bold text-red-600">Oylik yig'im yechilgan:</span>
                                <span className="text-sm font-black text-red-600">-{stats.charges.toLocaleString()} so'm</span>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </div>

      {isBonusModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6">
              <h2 className="text-xl font-bold">Bonus ball qo'shish</h2>
              <div className="space-y-4">
                 <input type="number" className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-indigo-600" placeholder="Ball miqdori" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} />
                 <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl outline-none text-sm" placeholder="Izoh (ixtiyoriy)" value={bonusNote} onChange={e => setBonusNote(e.target.value)} />
                 <div className="flex gap-3">
                    <button onClick={() => setIsBonusModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold">Bekor</button>
                    <button onClick={handleAddBonus} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100">Saqlash</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 p-4">
           <video ref={videoRef} autoPlay playsInline className="w-full max-w-lg aspect-square object-cover rounded-3xl" />
           <div className="flex gap-4 mt-8">
              <button onClick={() => { (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); setIsCameraOpen(false); }} className="px-6 py-3 bg-white/10 text-white rounded-2xl font-bold">Bekor</button>
              <button onClick={capturePhoto} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">Rasmga olish</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
