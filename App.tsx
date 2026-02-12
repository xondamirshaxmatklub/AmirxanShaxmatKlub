
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Users, Users2, Calendar, AlertCircle, Snowflake, 
  TrendingUp, Wallet, Settings, ShieldCheck, 
  LogOut, Menu, X, Send, Loader2, CheckCircle2, XCircle, Info
} from 'lucide-react';
import { db } from './db';
import { STORAGE_KEYS } from './constants';
import { UserRole, AuthUser } from './types';
import { processBotUpdates } from './services/telegram';

// Import page components
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Groups from './pages/Groups';
import Attendance from './pages/Attendance';
import Broadcast from './pages/Broadcast';
import Absences from './pages/Absences';
import FrozenStudents from './pages/FrozenStudents';
import Ratings from './pages/Ratings';
import Finance from './pages/Finance';
import Requests from './pages/Requests';
import AppSettings from './pages/Settings';

// Global Contexts
export const SyncContext = createContext<{ version: number }>({ version: 0 });
export const ToastContext = createContext<{
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}>({ showToast: () => {} });

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }> = ({ to, icon, label, active, onClick }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </Link>
);

const AppLayout: React.FC<{ user: AuthUser, onLogout: () => void, children: React.ReactNode }> = ({ user, onLogout, children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/', icon: <TrendingUp size={20}/>, label: 'Bosh sahifa' },
    { to: '/students', icon: <Users size={20}/>, label: 'O\'quvchilar' },
    { to: '/groups', icon: <Users2 size={20}/>, label: 'Guruhlar' },
    { to: '/attendance', icon: <Calendar size={20}/>, label: 'Davomat' },
    { to: '/broadcast', icon: <Send size={20}/>, label: 'Xabarnoma' },
    { to: '/absences', icon: <AlertCircle size={20}/>, label: 'Kelmaganlar' },
    { to: '/frozen', icon: <Snowflake size={20}/>, label: 'Muzlatilganlar' },
    { to: '/ratings', icon: <TrendingUp size={20}/>, label: 'Reyting' },
    { to: '/finance', icon: <Wallet size={20}/>, label: 'Balans' },
  ];

  if (user.role === UserRole.BOSH_ADMIN) {
    links.push({ to: '/requests', icon: <ShieldCheck size={20}/>, label: 'So\'rovlar' });
  }
  links.push({ to: '/settings', icon: <Settings size={20}/>, label: 'Sozlamalar' });

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><TrendingUp className="text-white" size={24} /></div>
            <div><h1 className="font-bold text-gray-900 leading-tight">Shaxmat CRM</h1><p className="text-xs text-gray-500">{user.role === UserRole.BOSH_ADMIN ? 'Bosh Admin' : 'Admin'}</p></div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-400"><X size={24} /></button>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar py-2">
          {links.map((link) => (
            <SidebarLink key={link.to} to={link.to} icon={link.icon} label={link.label} active={location.pathname === link.to} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={20} /><span className="font-medium">Chiqish</span></button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 lg:hidden shrink-0">
          <div className="h-16 flex items-center justify-between px-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600"><Menu size={24} /></button>
            <span className="font-semibold">Shaxmat Klubi</span>
            <div className="w-10"></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar">{children}</div>
      </main>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => db.get<AuthUser | null>(STORAGE_KEYS.AUTH, null));
  const [isDbReady, setIsDbReady] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const initDb = async () => {
      await db.init();
      setIsDbReady(true);
      db.onChange((key, data) => {
        if (key === STORAGE_KEYS.AUTH) setCurrentUser(data);
        setSyncVersion(v => v + 1);
      });
      const auth = db.get<AuthUser | null>(STORAGE_KEYS.AUTH, null);
      if (auth) setCurrentUser(auth);
    };
    initDb();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const poll = async () => {
      if (!active) return;
      await processBotUpdates();
      // Long Polling ishlatilgani uchun, keyingi so'rovni darhol (100ms dan keyin) yuboramiz.
      // Chunki processBotUpdates o'zi Telegram xabar kelishini 30 soniya kutib turadi.
      if (active) setTimeout(poll, 100);
    };
    poll();
    return () => { active = false; };
  }, [currentUser]);

  if (!isDbReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Ma'lumotlar yuklanmoqda...</p>
      </div>
    );
  }

  if (!currentUser) return <LoginPage onLogin={(u) => { db.set(STORAGE_KEYS.AUTH, u); setCurrentUser(u); }} />;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <SyncContext.Provider value={{ version: syncVersion }}>
        <HashRouter>
          <AppLayout user={currentUser} onLogout={() => { db.set(STORAGE_KEYS.AUTH, null); setCurrentUser(null); }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/students/:id" element={<StudentProfile />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/attendance" element={<Attendance user={currentUser} />} />
              <Route path="/broadcast" element={<Broadcast />} />
              <Route path="/absences" element={<Absences />} />
              <Route path="/frozen" element={<FrozenStudents />} />
              <Route path="/ratings" element={<Ratings />} />
              <Route path="/finance" element={<Finance user={currentUser}/>} />
              <Route path="/requests" element={currentUser.role === UserRole.BOSH_ADMIN ? <Requests /> : <Navigate to="/" />} />
              <Route path="/settings" element={<AppSettings user={currentUser} onUserUpdate={setCurrentUser}/>} />
            </Routes>
          </AppLayout>
        </HashRouter>

        {/* Toast Notification Overlay */}
        {toast && (
          <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-8 fade-in duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
              toast.type === 'error' ? 'bg-red-600 border-red-400 text-white' : 
              'bg-indigo-600 border-indigo-400 text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={24}/> : toast.type === 'error' ? <XCircle size={24}/> : <Info size={24}/>}
              <p className="font-bold text-sm">{toast.msg}</p>
            </div>
          </div>
        )}
      </SyncContext.Provider>
    </ToastContext.Provider>
  );
}
