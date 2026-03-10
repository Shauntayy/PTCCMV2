import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Library,
  Copy,
  ArrowLeftRight,
  BarChart3,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/collection', label: 'Collection', Icon: Library },
  { to: '/duplicates', label: 'Duplicates', Icon: Copy },
  { to: '/trades', label: 'Trades', Icon: ArrowLeftRight },
  { to: '/progress', label: 'Progress', Icon: BarChart3 },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-20">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="bg-indigo-500 rounded-xl p-2 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" fill="#fff" fillOpacity="0.15" />
              <path d="M7 15l3-6 3 6 3-8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-base tracking-wide">PTCCM</div>
            <div className="text-slate-400 text-xs">Trading Collector</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Info + Sign Out */}
        <div className="border-t border-slate-700 px-3 py-4 space-y-2">
          <div className="px-3 text-slate-400 text-xs truncate">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
