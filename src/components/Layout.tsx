import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, ShieldAlert, Settings, Car, Users } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/inspector', label: 'Inspector', icon: Search },
    { path: '/admin', label: 'Dashboard Admin', icon: LayoutDashboard },
    { path: '/admin/vehiculos', label: 'Ficha Vehículos', icon: Car },
    { path: '/admin/conductores', label: 'Ficha Conductores', icon: Users },
  ];

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
            {menuItems.map((item) => {
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
