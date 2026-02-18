import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Car, Users, UserCheck } from 'lucide-react';
import { useStore } from '../contexts/StateContext';
import type { UserRole } from '../types';

const Layout: React.FC = () => {
  const location = useLocation();
  const { userRole, setUserRole } = useStore();

  const menuItems: Array<{ path: string; label: string; icon: React.ElementType; roles: UserRole[] }> = [
    { path: '/inspector', label: 'Inspector', icon: Search, roles: ['inspector', 'superadmin'] },
    { path: '/admin', label: 'Dashboard Admin', icon: LayoutDashboard, roles: ['admin', 'superadmin'] },
    { path: '/admin/vehiculos', label: 'Ficha Vehículos', icon: Car, roles: ['admin', 'superadmin'] },
    { path: '/admin/conductores', label: 'Ficha Conductores', icon: Users, roles: ['admin', 'superadmin'] },
    { path: '/admin/controladores', label: 'Ficha Controladores', icon: UserCheck, roles: ['admin', 'superadmin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-slate-800">
          <Car className="text-orange-500" size={28} />
          <h1 className="text-xl font-bold">Línea 8 Taxi</h1>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isActive ? 'bg-orange-500 text-white' : 'hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <label htmlFor="user-role" className="block text-xs text-slate-400 mb-2">
            Usuario actual
          </label>
          <select
            id="user-role"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-sm"
          >
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="inspector">Inspector</option>
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
