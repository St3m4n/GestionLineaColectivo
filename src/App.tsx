import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { StateProvider } from './contexts/StateContext';
import { useStore } from './contexts/StateContext';
import Layout from './components/Layout';
import InspectorView from './views/InspectorView';
import AdminDashboard from './views/AdminDashboard';
import GestionVehiculos from './views/GestionVehiculos';
import GestionConductores from './views/GestionConductores';
import GestionControladores from './views/GestionControladores';
import type { UserRole } from './types';

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  inspector: '/inspector',
  admin: '/admin',
  superadmin: '/inspector',
};

const HomeRedirect = () => {
  const { userRole } = useStore();
  return <Navigate to={DEFAULT_ROUTE_BY_ROLE[userRole]} replace />;
};

const RoleGuard = ({ roles, children }: { roles: UserRole[]; children: ReactElement }) => {
  const { userRole } = useStore();
  if (!roles.includes(userRole)) {
    return <Navigate to={DEFAULT_ROUTE_BY_ROLE[userRole]} replace />;
  }
  return children;
};

function App() {
  return (
    <StateProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route
              path="inspector"
              element={
                <RoleGuard roles={['inspector', 'superadmin']}>
                  <InspectorView />
                </RoleGuard>
              }
            />
            <Route
              path="admin"
              element={
                <RoleGuard roles={['admin', 'superadmin']}>
                  <AdminDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="admin/vehiculos"
              element={
                <RoleGuard roles={['admin', 'superadmin']}>
                  <GestionVehiculos />
                </RoleGuard>
              }
            />
            <Route
              path="admin/conductores"
              element={
                <RoleGuard roles={['admin', 'superadmin']}>
                  <GestionConductores />
                </RoleGuard>
              }
            />
            <Route
              path="admin/controladores"
              element={
                <RoleGuard roles={['admin', 'superadmin']}>
                  <GestionControladores />
                </RoleGuard>
              }
            />
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Routes>
      </Router>
    </StateProvider>
  );
}

export default App;
