
import React from 'react';
import { db } from '../db';
import { LedgerType } from '../types';
import { Users, Users2, Calendar, TrendingUp, Wallet, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-2xl ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const students = db.getStudents();
  const groups = db.getGroups();
  const sessions = db.getSessions();
  const ledger = db.getLedger();

  const activeStudents = students.filter(s => s.isActive);
  const totalCoins = ledger.filter(l => l.type !== LedgerType.CHARGE).reduce((sum, l) => sum + l.amount, 0);
  
  // Calculate attendance rate
  const records = db.getRecords();
  const attendanceRate = records.length > 0 
    ? Math.round((records.filter(r => r.status === 'KELDI' || r.status === 'KECHIKDI').length / records.length) * 100) 
    : 0;

  const chartData = [
    { name: 'O\'quvchilar', val: students.length, color: '#4F46E5' },
    { name: 'Guruhlar', val: groups.length, color: '#10B981' },
    { name: 'Faol', val: activeStudents.length, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bosh sahifa</h1>
        <p className="text-gray-500">Klubning umumiy ko'rsatkichlari</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Jami o'quvchilar" 
          value={students.length} 
          icon={<Users className="text-indigo-600" size={24}/>} 
          color="bg-indigo-50"
        />
        <StatCard 
          title="Guruhlar" 
          value={groups.length} 
          icon={<Users2 className="text-emerald-600" size={24}/>} 
          color="bg-emerald-50"
        />
        <StatCard 
          title="Davomat ko'rsatkichi" 
          value={`${attendanceRate}%`} 
          icon={<Calendar className="text-amber-600" size={24}/>} 
          color="bg-amber-50"
        />
        <StatCard 
          title="Umumiy Coinlar" 
          value={totalCoins} 
          icon={<Star className="text-purple-600" size={24}/>} 
          color="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">Statistika</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip 
                  cursor={{fill: '#F9FAFB'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="val" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">Oxirgi harakatlar</h3>
          <div className="space-y-4">
            {sessions.slice(-5).reverse().map(session => {
              const group = groups.find(g => g.id === session.groupId);
              return (
                <div key={session.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                    {group?.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{group?.name}</p>
                    <p className="text-xs text-gray-500">{session.date}</p>
                  </div>
                  <div className={`text-[10px] px-2 py-1 rounded-full font-medium ${session.isClosed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {session.isClosed ? 'Yakunlangan' : 'Ochiq'}
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && <p className="text-center text-gray-400 py-10">Ma'lumotlar yo'q</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
