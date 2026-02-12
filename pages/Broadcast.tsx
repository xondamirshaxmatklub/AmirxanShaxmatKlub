
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Group, Student } from '../types';
import { Send, Users, User, MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { broadcastToTelegram } from '../services/telegram';

const Broadcast: React.FC = () => {
  const [targetType, setTargetType] = useState<'all' | 'group' | 'student'>('all');
  const [message, setMessage] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{success: number, failed: number} | null>(null);

  useEffect(() => {
    setGroups(db.getGroups());
    setStudents(db.getStudents().filter(s => s.isActive));
  }, []);

  const handleSend = async () => {
    if (!message) { alert('Xabar matnini kiriting'); return; }
    if (targetType !== 'all' && selectedIds.length === 0) { alert('Kamida bitta nishonni tanlang'); return; }

    setLoading(true);
    setReport(null);
    try {
      const res = await broadcastToTelegram(targetType, selectedIds, message);
      setReport(res);
      if (res.success > 0 || res.failed > 0) {
        setMessage('');
        setSelectedIds([]);
      }
    } catch (e) {
      alert('Xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Telegram Xabarnoma</h1>
        <p className="text-gray-500">Ota-onalarga umumiy yoki guruhli xabarlar yuborish</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        {report && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
             <div className="flex flex-col items-center">
                <CheckCircle className="text-emerald-500 mb-1" size={24}/>
                <span className="text-xl font-black text-emerald-600">{report.success}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Yetib bordi</span>
             </div>
             <div className="flex flex-col items-center">
                <XCircle className="text-red-500 mb-1" size={24}/>
                <span className="text-xl font-black text-red-600">{report.failed}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Xatolik</span>
             </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase">Kimga yuborilsin?</label>
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button onClick={() => { setTargetType('all'); setSelectedIds([]); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${targetType === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>Barchaga</button>
            <button onClick={() => { setTargetType('group'); setSelectedIds([]); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${targetType === 'group' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>Guruhlarga</button>
            <button onClick={() => { setTargetType('student'); setSelectedIds([]); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${targetType === 'student' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>Shaxsan</button>
          </div>
        </div>

        {targetType === 'group' && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
            {groups.map(g => (
              <button key={g.id} onClick={() => toggleSelection(g.id)} className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${selectedIds.includes(g.id) ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>{g.name}</button>
            ))}
          </div>
        )}

        {targetType === 'student' && (
          <div className="max-h-48 overflow-y-auto no-scrollbar space-y-2 p-1">
            {students.map(s => (
              <button key={s.id} onClick={() => toggleSelection(s.id)} className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all ${selectedIds.includes(s.id) ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>{s.ism} {s.familiya}</button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase">Xabar mazmuni</label>
          <textarea rows={6} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all text-sm" value={message} onChange={e => setMessage(e.target.value)} placeholder="Hurmatli ota-onalar, darslarimiz vaqti o'zgardi..."></textarea>
        </div>

        <button onClick={handleSend} disabled={loading || !message} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
          {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
          <span>{loading ? 'Yuborilmoqda...' : 'Xabarni yuborish'}</span>
        </button>
      </div>
    </div>
  );
};

export default Broadcast;
