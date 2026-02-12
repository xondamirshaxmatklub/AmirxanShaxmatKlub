
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { DeleteRequest, Student, Group } from '../types';
import { ShieldAlert, Check, X, User, Users2 } from 'lucide-react';
import { SyncContext, ToastContext } from '../App';

const Requests: React.FC = () => {
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    setRequests(db.getDeleteRequests().filter(r => r.status === 'PENDING'));
    setStudents(db.getStudents());
    setGroups(db.getGroups());
  }, [version]);

  const getEntityName = (req: DeleteRequest) => {
    if (req.entityType === 'student') {
      const s = students.find(item => item.id === req.entityId);
      return s ? `${s.ism} ${s.familiya}` : "Noma'lum o'quvchi";
    } else if (req.entityType === 'group') {
      const g = groups.find(item => item.id === req.entityId);
      return g ? g.name : "Noma'lum guruh";
    }
    return "Noma'lum obyekt";
  };

  const handleApprove = (req: DeleteRequest) => {
    if (req.entityType === 'student') {
      const allStudents = db.getStudents();
      const updated = allStudents.map(s => s.id === req.entityId ? { ...s, isActive: false } : s);
      db.set(STORAGE_KEYS.STUDENTS, updated);
      
      // Guruh a'zoligidan ham o'chirish
      const memberships = db.getGroupMembers().filter(m => m.studentId !== req.entityId);
      db.set(STORAGE_KEYS.GROUP_MEMBERS, memberships);
      
    } else if (req.entityType === 'group') {
      const allGroups = db.getGroups();
      const updated = allGroups.map(g => g.id === req.entityId ? { ...g, isActive: false } : g);
      db.set(STORAGE_KEYS.GROUPS, updated);
      
      // Guruh a'zolarini yetim qoldirish
      const memberships = db.getGroupMembers().filter(m => m.groupId !== req.entityId);
      db.set(STORAGE_KEYS.GROUP_MEMBERS, memberships);
    }

    const allReqs = db.getDeleteRequests();
    const updatedReqs = allReqs.map(r => r.id === req.id ? { ...r, status: 'APPROVED' as const } : r);
    db.set(STORAGE_KEYS.DELETE_REQUESTS, updatedReqs);
    showToast('So\'rov tasdiqlandi. O\'quvchi barcha ro\'yxatlardan olib tashlandi.', 'success');
  };

  const handleReject = (reqId: string) => {
    const allReqs = db.getDeleteRequests();
    const updatedReqs = allReqs.map(r => r.id === reqId ? { ...r, status: 'REJECTED' as const } : r);
    db.set(STORAGE_KEYS.DELETE_REQUESTS, updatedReqs);
    showToast('So\'rov rad etildi', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">O'chirish so'rovlari</h1>
          <p className="text-gray-500">Bosh admin tomonidan tasdiqlash uchun</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="divide-y divide-gray-50">
            {requests.map(req => (
              <div key={req.id} className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6 hover:bg-gray-50/50 transition-colors">
                 <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-2xl ${req.entityType === 'student' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                       {req.entityType === 'student' ? <User size={24}/> : <Users2 size={24}/>}
                    </div>
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{req.entityType === 'student' ? 'O\'quvchi' : 'Guruh'}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="text-[10px] font-bold text-red-500 uppercase">O'chirish so'ralgan</span>
                       </div>
                       <h3 className="text-lg font-bold text-gray-900 mb-1">{getEntityName(req)}</h3>
                       <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <p className="text-sm text-gray-600 leading-relaxed italic">"{req.reason}"</p>
                       </div>
                       <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400 font-bold uppercase">
                          <span className="bg-white px-2 py-0.5 border rounded-md">Yuborgan: {req.requestedBy}</span>
                          <span>•</span>
                          <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleApprove(req)} 
                      className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 transition-all"
                    >
                      <Check size={18}/> Tasdiqlash
                    </button>
                    <button 
                      onClick={() => handleReject(req.id)} 
                      className="flex-1 sm:flex-none px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                    >
                      <X size={18}/> Rad etish
                    </button>
                 </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="py-32 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert size={40} className="text-gray-200" />
                </div>
                <h3 className="text-gray-900 font-bold">Yangi so'rovlar yo'q</h3>
                <p className="text-gray-400 text-sm mt-1">Barcha so'rovlar ko'rib chiqilgan</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Requests;
