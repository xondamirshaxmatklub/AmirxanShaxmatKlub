
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { STORAGE_KEYS } from '../constants';
import { AuthUser, UserRole, TelegramLog } from '../types';
import { Cpu, Activity, Send, Users, RefreshCw, Trash2, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { checkBotStatus } from '../services/telegram';
import { SyncContext } from '../App';

interface Props {
  user: AuthUser;
  onUserUpdate: (user: AuthUser) => void;
}

const AppSettings: React.FC<Props> = ({ user, onUserUpdate }) => {
  const { version } = useContext(SyncContext);
  const [botToken, setBotToken] = useState(localStorage.getItem(STORAGE_KEYS.TELEGRAM_BOT_TOKEN) || '');
  const [botStatus, setBotStatus] = useState<any>(null);
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (user.role === UserRole.BOSH_ADMIN) setAllUsers(db.getUsers());
    setLogs(db.get<TelegramLog[]>(STORAGE_KEYS.TELEGRAM_LOGS, []));
    checkStatus();
  }, [user.role, version]);

  const checkStatus = async () => {
    setIsChecking(true);
    const status = await checkBotStatus();
    setBotStatus(status);
    setIsChecking(false);
  };

  const handleSaveToken = () => {
    db.set(STORAGE_KEYS.TELEGRAM_BOT_TOKEN, botToken);
    localStorage.removeItem(STORAGE_KEYS.TELEGRAM_OFFSET);
    alert('Bot token yangilandi va xabarlar navbati (offset) tozalandi');
    checkStatus();
  };

  const handleClearOffset = () => {
    localStorage.removeItem(STORAGE_KEYS.TELEGRAM_OFFSET);
    alert('Xabarlar navbati tozalandi. Bot endi faqat yangi kelgan xabarlarni o\'qiydi.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tizim Diagnostikasi</h1>
        <button onClick={checkStatus} className={`p-2 bg-indigo-600 text-white rounded-xl shadow-lg ${isChecking ? 'animate-spin' : ''}`}>
           <RefreshCw size={20}/>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-indigo-600"><Cpu size={20}/> Telegram Bot</h3>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${botStatus?.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {botStatus?.status || 'Tekshirilmoqda...'}
            </span>
          </div>
          
          <div className="space-y-4">
             <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Joriy Bot Token</label>
                <input type="text" className="w-full p-3 bg-gray-50 border rounded-xl mt-1 text-[10px] font-mono" value={botToken} onChange={e => setBotToken(e.target.value)} />
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                <button onClick={handleSaveToken} className="py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs">Yangilash</button>
                <button onClick={handleClearOffset} className="py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl text-xs flex items-center justify-center gap-1"><Trash2 size={14}/> Reset Polling</button>
             </div>
             
             <div className="p-4 rounded-2xl border border-dashed border-gray-200">
                <div className="flex items-center gap-3 mb-2 text-xs font-bold text-gray-600">
                  <Activity size={14} className="text-indigo-600"/> Holat ma'lumotlari:
                </div>
                {botStatus?.bot ? (
                   <div className="space-y-1">
                      <p className="text-[11px] flex justify-between"><span>Bot nomi:</span> <span className="font-bold">{botStatus.bot.first_name}</span></p>
                      <p className="text-[11px] flex justify-between"><span>Username:</span> <span className="font-bold">@{botStatus.bot.username}</span></p>
                      <p className="text-[11px] flex justify-between"><span>Can join groups:</span> <span className="text-emerald-600 font-bold">{botStatus.bot.can_join_groups ? 'HA' : 'YO\'Q'}</span></p>
                   </div>
                ) : (
                   <p className="text-[11px] text-red-500 italic font-medium">{botStatus?.error || 'Ma\'lumot yuklanmadi'}</p>
                )}
             </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[380px] flex flex-col">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold flex items-center gap-2 text-indigo-600"><Send size={20}/> Oxirgi harakatlar</h3>
             <span className="text-[10px] text-gray-400 font-bold">{logs.length} ta log</span>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {logs.map(log => (
                <div key={log.id} className={`p-3 rounded-xl text-[10px] border ${log.status === 'OK' ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'}`}>
                   <div className="flex justify-between font-black uppercase mb-1">
                      <div className="flex items-center gap-1">
                         {log.status === 'OK' ? <CheckCircle2 size={10} className="text-emerald-600"/> : <XCircle size={10} className="text-red-600"/>}
                         <span className={log.status === 'OK' ? 'text-emerald-600' : 'text-red-600'}>{log.type}</span>
                      </div>
                      <span className="text-gray-400 font-normal">{new Date(log.time).toLocaleTimeString()}</span>
                   </div>
                   <p className="text-gray-600 font-medium">Chat: {log.chatId} • {log.message}</p>
                   {log.error && <p className="text-red-500 mt-1 italic font-bold">Xato: {log.error}</p>}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                   <Send size={40} className="opacity-10 mb-2"/>
                   <p className="text-[11px] font-bold">Loglar hali mavjud emas</p>
                </div>
              )}
           </div>
        </section>
      </div>

      {user.role === UserRole.BOSH_ADMIN && (
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-indigo-600"><ShieldCheck size={20}/> Tizim boshqaruvi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Ulangan ota-onalar</p>
                <p className="text-2xl font-black text-indigo-600">{db.get<any[]>(STORAGE_KEYS.TELEGRAM_PARENTS, []).length}</p>
             </div>
             <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Jami o'quvchilar</p>
                <p className="text-2xl font-black text-gray-900">{db.getStudents().length}</p>
             </div>
             <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Guruhlar</p>
                <p className="text-2xl font-black text-emerald-600">{db.getGroups().length}</p>
             </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AppSettings;
