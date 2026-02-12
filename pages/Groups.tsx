
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS, WEEKDAYS } from '../constants';
import { Group, Student, GroupMember, DeleteRequest } from '../types';
import { Plus, Search, Users2, Clock, Calendar, Edit3, UserPlus, X, Trash2, CheckCircle2 } from 'lucide-react';
import { SyncContext } from '../App';

const Groups: React.FC = () => {
  const { version } = useContext(SyncContext);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  
  const initialForm: Partial<Group> = {
    name: '', weekdays: [], startTime: '10:00', endTime: '11:30', isActive: true
  };
  const [formData, setFormData] = useState<Partial<Group>>(initialForm);

  useEffect(() => {
    setGroups(db.getGroups().filter(g => g.isActive !== false));
    setAllStudents(db.getStudents().filter(s => s.isActive));
    setGroupMembers(db.getGroupMembers());
  }, [version]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'gr-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  };

  const handleSave = () => {
    if (!formData.name?.trim() || formData.weekdays?.length === 0) {
      alert('Iltimos guruh nomi va haftalik kunlarni tanlang'); 
      return;
    }

    const currentGroups = db.getGroups();
    let updated;

    if (editingGroup) {
      updated = currentGroups.map(g => g.id === editingGroup.id ? { 
        ...g, 
        ...formData,
        name: formData.name!.trim(),
        weekdays: formData.weekdays!,
        startTime: formData.startTime!,
        endTime: formData.endTime!
      } as Group : g);
    } else {
      const newGroup: Group = {
        id: generateId(),
        name: formData.name!.trim(),
        weekdays: formData.weekdays!,
        startTime: formData.startTime!,
        endTime: formData.endTime!,
        isActive: true
      };
      updated = [...currentGroups, newGroup];
    }

    db.set(STORAGE_KEYS.GROUPS, updated);
    setIsModalOpen(false);
    setEditingGroup(null);
    setFormData(initialForm);
  };

  const handleRequestDelete = () => {
    if (!selectedGroup || !deleteReason.trim()) {
      alert('O\'chirish sababini yozing');
      return;
    }
    const requests = db.getDeleteRequests();
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) || '{}');
    
    const newRequest: DeleteRequest = {
      id: generateId(),
      entityType: 'group',
      entityId: selectedGroup.id,
      requestedBy: currentUser.username || 'Admin',
      reason: deleteReason,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    db.set(STORAGE_KEYS.DELETE_REQUESTS, [...requests, newRequest]);
    alert('Guruhni o\'chirish so\'rovi yuborildi');
    setIsDeleteModalOpen(false);
    setDeleteReason('');
  };

  const toggleWeekday = (day: string) => {
    const current = formData.weekdays || [];
    setFormData({...formData, weekdays: current.includes(day) ? current.filter(d => d !== day) : [...current, day]});
  };

  const handleAddMember = (studentId: string) => {
    if (!selectedGroup) return;
    const currentMembers = db.getGroupMembers();
    if (currentMembers.some(m => m.groupId === selectedGroup.id && m.studentId === studentId)) {
      const updated = currentMembers.filter(m => !(m.groupId === selectedGroup.id && m.studentId === studentId));
      db.set(STORAGE_KEYS.GROUP_MEMBERS, updated);
      setGroupMembers(updated);
    } else {
      const newMember: GroupMember = { id: generateId(), groupId: selectedGroup.id, studentId };
      const updated = [...currentMembers, newMember];
      db.set(STORAGE_KEYS.GROUP_MEMBERS, updated);
      setGroupMembers(updated);
    }
  };

  const isMember = (studentId: string) => {
    return groupMembers.some(m => m.groupId === selectedGroup?.id && m.studentId === studentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Guruhlar</h1>
        <button onClick={() => { setEditingGroup(null); setFormData(initialForm); setIsModalOpen(true); }} className="bg-indigo-600 text-white p-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
          <Plus size={20} /> Yangi guruh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users2 size={24} /></div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedGroup(group); setIsMemberModalOpen(true); }} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-colors" title="O'quvchi qo'shish"><UserPlus size={20} /></button>
                <button onClick={() => { setEditingGroup(group); setFormData(group); setIsModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors" title="Tahrirlash"><Edit3 size={20} /></button>
                <button onClick={() => { setSelectedGroup(group); setIsDeleteModalOpen(true); }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="O'chirish"><Trash2 size={20} /></button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
            <p className="text-xs text-gray-400 font-bold mb-4 uppercase">{groupMembers.filter(m => m.groupId === group.id).length} TA O'QUVCHI</p>
            <div className="space-y-2 text-sm text-gray-500">
               <div className="flex items-center gap-2"><Clock size={16}/> {group.startTime} - {group.endTime}</div>
               <div className="flex items-center gap-2 flex-wrap"><Calendar size={16}/> {group.weekdays.join(', ')}</div>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 italic">Hali guruhlar yaratilmagan</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold">{editingGroup ? 'Guruhni tahrirlash' : 'Yangi guruh'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Guruh nomi</label>
                <input type="text" placeholder="Masalan: Master Chess" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Kunlar</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => (
                    <button key={day} onClick={() => toggleWeekday(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${formData.weekdays?.includes(day) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Boshlanishi</label>
                  <input type="time" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" value={formData.startTime || '10:00'} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tugashi</label>
                  <input type="time" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" value={formData.endTime || '11:30'} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:text-gray-900">Bekor qilish</button>
                <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Saqlash</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMemberModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold">{selectedGroup.name}: A'zolar</h2>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-2 no-scrollbar">
              {allStudents.length > 0 ? allStudents.map(student => (
                <button key={student.id} onClick={() => handleAddMember(student.id)} className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${isMember(student.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm'}`}>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{student.ism} {student.familiya}</p>
                    <p className="text-xs text-gray-500">ID: {student.studentCode}</p>
                  </div>
                  {isMember(student.id) ? (
                    <div className="bg-indigo-600 text-white p-1 rounded-full"><CheckCircle2 size={20} /></div>
                  ) : (
                    <div className="w-6 h-6 border-2 rounded-full border-gray-200" />
                  )}
                </button>
              )) : (
                <p className="text-center text-gray-400 py-10 italic">Faol o'quvchilar topilmadi</p>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50/50 text-center">
              <button onClick={() => setIsMemberModalOpen(false)} className="px-10 py-2.5 bg-gray-900 text-white rounded-xl font-bold">Yopish</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">Guruhni o'chirish so'rovi</h2>
            <p className="text-sm text-gray-500 mb-4"><b>{selectedGroup?.name}</b> ni o'chirish sababini yozing:</p>
            <textarea className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl mb-4 outline-none focus:bg-white focus:ring-2 focus:ring-red-100" rows={3} value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Masalan: Guruh tarqatib yuborildi..."></textarea>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 font-bold text-gray-400">Bekor qilish</button>
              <button onClick={handleRequestDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all">So'rovni yuborish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
