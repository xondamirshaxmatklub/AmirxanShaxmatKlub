
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Absence, Student, Group } from '../types';
import { AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';

const Absences: React.FC = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    setAbsences(db.getAbsences());
    setStudents(db.getStudents());
    setGroups(db.getGroups());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kelmaganlar</h1>
        <p className="text-gray-500">Sababli dars qoldirgan o'quvchilar ro'yxati</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {absences.map(abs => {
            const student = students.find(s => s.id === abs.studentId);
            const group = groups.find(g => g.id === abs.groupId);
            return (
              <div key={abs.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <AlertCircle size={20}/>
                   </div>
                   <div>
                      <p className="font-bold text-gray-900">{student?.ism} {student?.familiya}</p>
                      <p className="text-xs text-gray-500">{group?.name} • {abs.date}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-full">Sababli</span>
                   <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><CheckCircle2 size={20}/></button>
                </div>
              </div>
            );
          })}
          {absences.length === 0 && <p className="text-center text-gray-400 py-20">Sababli kelmaganlar yo'q</p>}
        </div>
      </div>
    </div>
  );
};

export default Absences;
