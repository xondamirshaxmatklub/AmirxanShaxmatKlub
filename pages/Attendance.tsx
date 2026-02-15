
import React, { useState, useEffect, useRef, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { 
  Group, Student, AttendanceSession, 
  AttendanceRecord, AttendanceStatus, 
  AuthUser, LedgerType, CoinLedger
} from '../types';
import { Camera, Check, RefreshCw, Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { identifyStudent } from '../services/gemini';
import { notifyAttendance } from '../services/telegram';
import { SyncContext, ToastContext } from '../App';

interface Props { user: AuthUser; }

const Attendance: React.FC<Props> = ({ user }) => {
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [members, setMembers] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFaceMode, setIsFaceMode] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [faceMsg, setFaceMsg] = useState('');

  useEffect(() => {
    setGroups(db.getGroups().filter(g => g.isActive));
  }, [version]);

  useEffect(() => {
    if (selectedGroupId && sessionDate) loadSession();
  }, [selectedGroupId, sessionDate, version]);

  const loadSession = () => {
    const allSessions = db.getSessions() || [];
    const group = db.getGroups().find(g => g.id === selectedGroupId);
    let current = allSessions.find(s => s.groupId === selectedGroupId && s.date === sessionDate);
    
    if (!current && group) {
      current = { id: db.generateId(), groupId: selectedGroupId, date: sessionDate, startTime: group.startTime, endTime: group.endTime, isClosed: false };
      const updatedSessions = [...allSessions, current];
      db.set(STORAGE_KEYS.ATTENDANCE_SESSIONS, updatedSessions);
    }
    
    setSession(current || null);
    const mIds = db.getGroupMembers().filter(m => m.groupId === selectedGroupId).map(m => m.studentId);
    setMembers(db.getStudents().filter(s => mIds.includes(s.id) && s.isActive !== false));
    setRecords((db.getRecords() || []).filter(r => r.sessionId === current?.id));
  };

  const setStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!session || session.isClosed) return;
    const all = db.getRecords() || [];
    let recIdx = all.findIndex(r => r.sessionId === session.id && r.studentId === studentId);
    const time = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const coins = status === AttendanceStatus.KELDI ? 5 : status === AttendanceStatus.KECHIKDI ? 3 : 0;

    if (recIdx > -1) {
      all[recIdx] = { ...all[recIdx], status, checkInTime: status !== AttendanceStatus.KELMADI ? time : undefined, coins: Number(coins), coinsApplied: false };
    } else {
      const newRec: AttendanceRecord = { id: db.generateId(), sessionId: session.id, studentId, status, checkInTime: status !== AttendanceStatus.KELMADI ? time : undefined, coins: Number(coins), coinsApplied: false };
      all.push(newRec);
    }

    db.set(STORAGE_KEYS.ATTENDANCE_RECORDS, all);
    if (status !== AttendanceStatus.KELMADI) {
      const student = members.find(m => m.id === studentId);
      if (student) {
         notifyAttendance(studentId, status, time, coins);
         const u = new SpeechSynthesisUtterance(`${student.ism} darsga keldi`);
         u.lang = 'uz-UZ';
         window.speechSynthesis.speak(u);
      }
    }
    setRecords([...all.filter(r => r.sessionId === session.id)]);
  };

  const captureFace = async () => {
    if (!videoRef.current || isLoading) return;
    setIsLoading(true);
    setFaceMsg('AI o\'quvchini qidirmoqda...');
    
    try {
      const c = document.createElement('canvas');
      const width = 640;
      const height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * width;
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const img = c.toDataURL('image/jpeg', 0.8);
      
      const candidates = members
        .filter(s => s.facePhoto && !s.isFrozen)
        .map(s => ({ id: s.id, photo: s.facePhoto!, name: `${s.ism} ${s.familiya}` }));
      
      if (candidates.length === 0) {
        setFaceMsg('Guruhda rasmga ega o\'quvchilar yo\'q');
        setIsLoading(false);
        return;
      }

      const res = await identifyStudent(img, candidates);
      if (res.match && res.studentId) {
        const student = members.find(m => m.id === res.studentId);
        if (student) {
          await setStatus(student.id, AttendanceStatus.KELDI);
          setFaceMsg(`Tanildi: ${student.ism}!`);
          setTimeout(() => setFaceMsg('Yuzni markazda tuting'), 1500);
        } else {
          setFaceMsg('O\'quvchi topildi, lekin guruhda emas');
        }
      } else {
        setFaceMsg('Tizim tanimadi. Qayta urinib ko\'ring');
      }
    } catch (err) {
      setFaceMsg('AI ulanishda xatolik');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Guruh</label>
          <select className="w-full p-3 bg-gray-50 border rounded-xl mt-1 outline-none font-bold" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
            <option value="">Tanlang...</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Sana</label>
          <input type="date" className="w-full p-3 bg-gray-50 border rounded-xl mt-1 outline-none font-bold" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button 
            onClick={() => { 
              setIsFaceMode(true); 
              setFaceMsg('Kamera ochilmoqda...');
              setTimeout(() => {
                navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 } } })
                  .then(s => {
                    if (videoRef.current) {
                      videoRef.current.srcObject = s;
                      setFaceMsg('Yuzni markazda tuting');
                    }
                  })
                  .catch((err) => { 
                    console.error("Kamera xatosi:", err);
                    showToast('Kameraga ruxsat berilmadi yoki u band', 'error'); 
                    setIsFaceMode(false); 
                  });
              }, 300); 
            }} 
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50" 
            disabled={!selectedGroupId || session?.isClosed}
          >
            <Camera size={20}/> FaceID Skaner
          </button>
        </div>
      </div>

      {session && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-indigo-50/30 border-b flex justify-between items-center">
            <h3 className="font-bold">Guruh: {groups.find(g => g.id === selectedGroupId)?.name}</h3>
            {!session.isClosed && (
              <button 
                onClick={() => { if(confirm('Darsni yakunlaysizmi?')) { 
                  const allSessions = db.getSessions();
                  const idx = allSessions.findIndex(s => s.id === session.id);
                  if (idx > -1) {
                    allSessions[idx].isClosed = true;
                    db.set(STORAGE_KEYS.ATTENDANCE_SESSIONS, allSessions);
                    showToast('Dars yakunlandi', 'success');
                    loadSession();
                  }
                }}}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Check size={16}/> Darsni yakunlash
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {members.map(s => {
              const r = records.find(rec => rec.studentId === s.id);
              return (
                <div key={s.id} className={`p-4 flex items-center justify-between ${s.isFrozen ? 'opacity-30' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-bold text-indigo-600 overflow-hidden border">
                      {s.facePhoto ? <img src={s.facePhoto} className="w-full h-full object-cover"/> : s.ism[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{s.ism} {s.familiya}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{r?.checkInTime || '--:--'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     {r?.status === AttendanceStatus.KELDI ? <CheckCircle2 className="text-emerald-500" size={24}/> : 
                      r?.status === AttendanceStatus.KECHIKDI ? <Clock className="text-amber-500" size={24}/> :
                      r?.status === AttendanceStatus.KELMADI ? <XCircle className="text-red-500" size={24}/> :
                      <div className="flex gap-1">
                        <button onClick={() => setStatus(s.id, AttendanceStatus.KELDI)} className="px-3 py-1 bg-gray-50 text-[10px] font-bold rounded-lg border">KELDI</button>
                        <button onClick={() => setStatus(s.id, AttendanceStatus.KELMADI)} className="px-3 py-1 bg-gray-50 text-[10px] font-bold rounded-lg border">YOK</button>
                      </div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isFaceMode && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-square bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-indigo-500/30">
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
               <div className="w-64 h-64 border-2 border-dashed border-white/30 rounded-full" />
            </div>
            <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4 px-6">
               <div className={`px-6 py-3 rounded-2xl text-white text-sm font-bold shadow-xl text-center w-full max-w-xs ${isLoading ? 'bg-indigo-600 animate-pulse' : 'bg-black/60 backdrop-blur-md'}`}>
                 {faceMsg}
               </div>
               <div className="flex gap-4">
                  <button onClick={captureFace} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 border-8 border-gray-200/20">
                    {isLoading ? <Loader2 size={32} className="animate-spin text-indigo-600"/> : <div className="w-12 h-12 bg-indigo-600 rounded-full shadow-inner"/>}
                  </button>
                  <button onClick={() => {
                    const tracks = (videoRef.current?.srcObject as MediaStream)?.getTracks();
                    tracks?.forEach(t => t.stop());
                    const newMode = facingMode === 'user' ? 'environment' : 'user';
                    setFacingMode(newMode);
                    navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode } })
                      .then(s => videoRef.current && (videoRef.current.srcObject = s))
                      .catch(() => showToast('Kamera almashtirib bo\'lmadi', 'error'));
                  }} className="w-20 h-20 bg-white/10 text-white rounded-full flex items-center justify-center shadow-lg transition-all backdrop-blur-md active:rotate-180">
                    <RefreshCw size={32}/>
                  </button>
               </div>
            </div>
          </div>
          <button onClick={() => { (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); setIsFaceMode(false); }} className="mt-8 px-8 py-3 bg-white/5 text-white/60 font-bold rounded-xl hover:text-white transition-colors">Yopish</button>
        </div>
      )}
    </div>
  );
};

export default Attendance;
