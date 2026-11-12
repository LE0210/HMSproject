import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import PatientEhr from './pages/PatientEhr.jsx';
import Appointments from './pages/Appointments.jsx';
import Prescriptions from './pages/Prescriptions.jsx';
import Pharmacy from './pages/Pharmacy.jsx';
import LabResults from './pages/LabResults.jsx';
import Billing from './pages/Billing.jsx';
import Reports from './pages/Reports.jsx';
import UserManagement from './pages/UserManagement.jsx';

/** Blocks a module when the signed-in role has no access to it. */
function Guard({ module, children }) {
  const { can } = useAuth();
  if (!can(module)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <Loading label="Restoring your session…" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Guard module="patients"><Patients /></Guard>} />
        <Route path="patients/:patientId" element={<Guard module="patients"><PatientEhr /></Guard>} />
        <Route path="appointments" element={<Guard module="appointments"><Appointments /></Guard>} />
        <Route path="prescriptions" element={<Guard module="prescriptions"><Prescriptions /></Guard>} />
        <Route path="pharmacy" element={<Guard module="pharmacy"><Pharmacy /></Guard>} />
        <Route path="labs" element={<Guard module="labs"><LabResults /></Guard>} />
        <Route path="billing" element={<Guard module="billing"><Billing /></Guard>} />
        <Route path="reports" element={<Guard module="reports"><Reports /></Guard>} />
        <Route path="staff" element={<Guard module="staff"><UserManagement /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}