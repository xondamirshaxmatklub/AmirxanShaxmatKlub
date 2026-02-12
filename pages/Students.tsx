
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { Student, DeleteRequest, Group, GroupMember } from '../types';
import { Plus, Search, Eye, Edit3, Snowflake, X, Phone, MapPin, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SyncContext, ToastContext } from '../App';

const Students: React.FC = () => {
  const { version } = useContext(SyncContext);
  const { showToast } = useContext(ToastContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<GroupMember[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  const initialForm: Partial<Student> = {
    ism: '', familiya: '', studentCode: '', monthlyFee: 0,
    startDate: new Date().toISOString().split('T')[0],
    studentPhone: '', address: '', isActive: true
  };
  const [formData, setFormData] = useState<Partial<Student>>(initialForm);

  useEffect(() => { 
    // Faqat isActive: true bo'lganlarni ko'rsatamiz
    setStudents(db.getStudents().filter(s => s.isActive !== false)); 
    setGroups(db.getGroups());
    setMemberships(db.getGroupMembers());
  }, [version]);

  const handleSave = () => {
    const ism = formData.ism?.trim();
    const familiya = formData.familiya?.trim();
    const code = formData.studentCode?.trim();

    if (!ism || !familiya || !code) {
      showToast('Ism, Familiya va ID majburiy!', 'error');
      return;
    }

    const currentStudents = db.getStudents();
    if (!editingStudent && currentStudents.some(s => s.studentCode?.toLowerCase() === code.toLowerCase() && s.isActive !== false)) {
      showToast(`ST-${code} ID band!`, 'error');
      return;
    }

    const studentData: Student = {
      ...(editingStudent || initialForm),
      ...formData,
      id: editingStudent ? editingStudent.id : (crypto.randomUUID ? crypto.randomUUID() : 'st-' + Date.now()),
      ism,
      familiya,
      studentCode: code,
      monthlyFee: Number(formData.monthlyFee) || 0,
      isActive: true,
      lastChargeDate: editingStudent?.lastChargeDate || new Date().toISOString()
    } as Student;

    let updated = editingStudent 
      ? currentStudents.map(s => s.id === editingStudent.id ? studentData : s)
      : [...currentStudents, studentData];

    db.set(STORAGE_KEYS.STUDENTS, updated);
    showToast(editingStudent ? 'Yangilandi' : 'Qo\'shildi', 'success');
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const getStudentGroup = (studentId: string) => {
    const membership = memberships.find(m => m.studentId === studentId);
    if (!membership) return 'Guruhsiz';
    const group = groups.find(g => g.id === membership.groupId);
    return group ? group.name : 'Guruhsiz';
  };

  const filtered = students.filter(s => 
    `${s.ism} ${s.familiya}`.toLowerCase().includes(search.toLowerCase()) || 
    s.studentCode.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">O'quvchilar</h1>
        <button onClick={() => { setEditingStudent(null); setFormData(initialForm); setIsModalOpen(true); }} className="bg-indigo-600 text-white p-3 rounded-2xl flex items-center gap-2 shadow-lg">
          <Plus size={20} /> Yangi o'quvchi
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Qidirish..." className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(student => (
          <div key={student.id} className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-all ${student.isFrozen ? 'opacity-60 grayscale' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-bold text-indigo-600 overflow-hidden text-xl">
                {student.facePhoto ? <img src={student.facePhoto} className="w-full h-full object-cover" /> : student.ism?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{student.ism} {student.familiya}</h3>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                  <span>ID: {student.studentCode}</span>
                  <span>•</span>
                  <span className="text-indigo-600 flex items-center gap-1"><Users size={10}/> {getStudentGroup(student.id)}</span>
                </div>
              </div>
              <div className="flex gap-1">
                 <button onClick={() => { setDeleteTarget(student); setIsDeleteModalOpen(true); }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                    <Trash2 size={18} />
                 </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <span className="text-sm font-black text-indigo-600">{Number(student.monthlyFee || 0).toLocaleString()} so'm</span>
              <div className="flex gap-2">
                <Link to={`/students/${student.id}`} className="p-2 text-gray-400 hover:text-indigo-600"><Eye size={20}/></Link>
                <button onClick={() => { setEditingStudent(student); setFormData(student); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-amber-600"><Edit3 size={20}/></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 italic">O'quvchilar topilmadi</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
              <h2 className="text-xl font-bold">{editingStudent ? 'Tahrirlash' : 'Yangi o\'quvchi'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={24}/></button>
            </div>
            <div className="p-6 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input type="text" placeholder="Ism *" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" value={formData.ism || ''} onChange={e => setFormData({...formData, ism: e.target.value})} />
                <input type="text" placeholder="Familiya *" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" value={formData.familiya || ''} onChange={e => setFormData({...formData, familiya: e.target.value})} />
                <input type="text" placeholder="ID (Code) *" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" value={formData.studentCode || ''} onChange={e => setFormData({...formData, studentCode: e.target.value})} />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">OYLIK TO'LOV (SO'M)</label>
                <input type="number" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none font-bold" value={formData.monthlyFee || 0} onChange={e => setFormData({...formData, monthlyFee: Number(e.target.value)})} />
                <input type="tel" placeholder="Telefon" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" value={formData.studentPhone || ''} onChange={e => setFormData({...formData, studentPhone: e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold">Bekor qilish</button>
              <button onClick={handleSave} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">Saqlash</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">O'chirish so'rovi</h2>
            <p className="text-sm text-gray-500 mb-4"><b>{deleteTarget?.ism}</b> ni o'chirish sababi:</p>
            <textarea className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl mb-4 outline-none" rows={3} value={deleteReason} onChange={e => setDeleteReason(e.target.value)}></textarea>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 font-bold text-gray-400">Bekor qilish</button>
              <button onClick={() => {
                 const reqs = db.getDeleteRequests();
                 const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) || '{}');
                 db.set(STORAGE_KEYS.DELETE_REQUESTS, [...reqs, {
                    id: crypto.randomUUID(), entityType: 'student', entityId: deleteTarget!.id,
                    requestedBy: user.username, reason: deleteReason, status: 'PENDING', createdAt: new Date().toISOString()
                 }]);
                 showToast('So\'rov yuborildi', 'info');
                 setIsDeleteModalOpen(false);
              }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg">Yuborish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
