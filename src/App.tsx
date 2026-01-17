import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StateProvider } from './contexts/StateContext';
import Layout from './components/Layout';
import InspectorView from './views/InspectorView';
import AdminDashboard from './views/AdminDashboard';
import GestionBloqueos from './views/GestionBloqueos';
import GestionCRUD from './views/GestionCRUD';

function App() {
  return (
    <StateProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/inspector" replace />} />
            <Route path="inspector" element={<InspectorView />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/bloqueos" element={<GestionBloqueos />} />
            <Route path="admin/gestion" element={<GestionCRUD />} />
          </Route>
        </Routes>
      </Router>
    </StateProvider>
  );
}

export default App;
