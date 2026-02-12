
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { Student, AttendanceRecord, CoinLedger, LedgerType, UserRole, AttendanceStatus } from '../types';
import { ArrowLeft, Camera, Phone, MapPin, Calendar, Star, Wallet, CheckCircle2, XCircle, Clock, Plus, Award, Info } from 'lucide-react';
import { ToastContext, SyncContext } from '../App';

const StudentProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [ledger, setLedger] = useState<CoinLedger[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) || '{}');

  useEffect(() => {
    const s = db.getStudents().find(st => st.id === id);
    if (s) {
      setStudent(s);
      setAttendance((db.getRecords() || []).filter(r => r.studentId === s.id));
      setLedger((db.getLedger() || []).filter(l => l.studentId === s.id));
    }
  }, [id, version]);

  // Jami ballar = Ledger + Pending Records
  const ledgerTotal = ledger
    .filter(l => l.type === LedgerType.ATTENDANCE || l.type === LedgerType.BONUS)
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const pendingTotal = attendance
    .filter(r => r.coinsApplied === false)
    .reduce((sum, r) => sum + Number(r.coins || 0), 0);

  const totalCoins = ledgerTotal + pendingTotal;

  // Balans hisoblash
  const payments = (db.getPayments() || []).filter(p => p.studentId === id).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const charges = ledger.filter(l => l.studentId === id && l.type === LedgerType.CHARGE).reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const balance = payments + charges;

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
         
         {currentUser.role === UserRole.BOSH_ADMIN && (
            <button 
              onClick={() => setIsBonusModalOpen(true)} 
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg"
            >
               <Award size={18}/> Bonus ball
            </button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center relative">
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
             <div className="flex items-center gap-3 text-sm"><div className="p-2 bg-gray-50 rounded-lg text-gray-400"><MapPin size={16}/></div><span className="font-bold text-gray-700">{student.address || '---'}</span></div>
             <div className="flex items-center gap-3 text-sm"><div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Calendar size={16}/></div><span className="font-bold text-gray-700">Qo'shilgan: {student.startDate}</span></div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/30">
                <h3 className="font-bold flex items-center gap-2"><Calendar size={18} className="text-indigo-600"/> Davomat tarixi</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 no-scrollbar">
                {attendance.length > 0 ? attendance.slice().reverse().map(rec => (
                  <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${rec.status === AttendanceStatus.KELDI ? 'bg-emerald-50 text-emerald-600' : rec.status === AttendanceStatus.KECHIKDI ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                          {rec.status === AttendanceStatus.KELDI ? <CheckCircle2 size={18}/> : rec.status === AttendanceStatus.KECHIKDI ? <Clock size={18}/> : <XCircle size={18}/>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{rec.status}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">{rec.checkInTime || '--:--'}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-xs font-black text-indigo-600">+{rec.coins} ball</span>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">{rec.coinsApplied ? 'Tasdiqlangan' : 'Kutilmoqda'}</p>
                     </div>
                  </div>
                )) : <div className="p-10 text-center text-gray-400 italic">Davomat yo'q</div>}
              </div>
           </div>

           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-gray-50/30 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Wallet size={18} className="text-indigo-600"/> Barcha harakatlar (Arxiv)</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 no-scrollbar">
                {ledger.length > 0 ? ledger.slice().reverse().map(l => (
                  <div key={l.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${l.type === LedgerType.CHARGE ? 'bg-red-50 text-red-600' : l.type === LedgerType.BONUS ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {l.type === LedgerType.CHARGE ? <Wallet size={18}/> : l.type === LedgerType.BONUS ? <Award size={18}/> : <Star size={18}/>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{l.note || l.type}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(l.dateTime).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <span className={`text-sm font-black whitespace-nowrap ${l.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                       {l.amount > 0 ? '+' : ''}{l.amount.toLocaleString()}
                     </span>
                  </div>
                )) : <div className="p-10 text-center text-gray-400 italic">Tranzaksiyalar yo'q</div>}
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
