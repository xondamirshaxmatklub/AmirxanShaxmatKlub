
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Student } from '../types';
import { Snowflake, CheckCircle2 } from 'lucide-react';

const FrozenStudents: React.FC = () => {
  const [frozen, setFrozen] = useState<Student[]>([]);

  useEffect(() => {
    setFrozen(db.getStudents().filter(s => s.isFrozen));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Muzlatilganlar</h1>
        <p className="text-gray-500">Darslardan vaqtincha to'xtatilgan o'quvchilar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {frozen.map(student => (
          <div key={student.id} className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm bg-blue-50/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Snowflake size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{student.ism} {student.familiya}</h3>
                <p className="text-xs text-gray-500">ID: {student.studentCode}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-50 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600">Muzlatish holati: AKTIV</span>
              <button className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors">Tiklash</button>
            </div>
          </div>
        ))}
        {frozen.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-gray-100">
             <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Snowflake size={32}/>
             </div>
             <p className="text-gray-400">Hozirda muzlatilgan o'quvchilar yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrozenStudents;
