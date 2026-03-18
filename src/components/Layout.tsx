import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Calendar, CheckSquare, FileText, Settings, LogOut, LayoutDashboard, Menu, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

export const Layout: React.FC = () => {
  const { userProfile, signOut } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) return saved === 'true';
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/completed-calendar', icon: CheckCircle2, label: 'Completed' },
    { to: '/notes', icon: FileText, label: 'Notes' },
    { to: '/team', icon: Users, label: 'Team' },
    { to: '/settings', icon: Settings, label: 'Integrations' },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
      <aside className={clsx(
        "bg-white border-r border-zinc-200 flex flex-col transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className={clsx("p-6 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-indigo-600" />
              TeamSync
            </h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={clsx("p-4 border-t border-zinc-200", isCollapsed && "flex flex-col items-center")}>
          <div className={clsx("flex items-center mb-4", isCollapsed ? "justify-center" : "gap-3")}>
            {userProfile?.photo_url ? (
              <img src={userProfile.photo_url} alt="Profile" className="w-10 h-10 rounded-full shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                {userProfile?.display_name?.charAt(0) || userProfile?.email?.charAt(0)}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{userProfile?.display_name}</p>
                <p className="text-xs text-zinc-500 truncate">{userProfile?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={clsx(
              "flex items-center text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-100 hover:text-zinc-900 transition-colors",
              isCollapsed ? "justify-center p-3 w-full" : "gap-2 w-full px-3 py-2"
            )}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
