import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StateProvider } from './contexts/StateContext';
import Layout from './components/Layout';
import InspectorView from './views/InspectorView';
import AdminDashboard from './views/AdminDashboard';
import GestionVehiculos from './views/GestionVehiculos';
import GestionConductores from './views/GestionConductores';

function App() {
  return (
    <StateProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/inspector" replace />} />
            <Route path="inspector" element={<InspectorView />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/vehiculos" element={<GestionVehiculos />} />
            <Route path="admin/conductores" element={<GestionConductores />} />
          </Route>
        </Routes>
      </Router>
    </StateProvider>
  );
}

export default App;
