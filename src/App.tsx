import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ErrorPage from "./components/errors/ErrorPage";
import NotFoundPage from "./pages/errors/NotFoundPage";
import Dashboard from "./pages/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import Incidents from "./pages/Incidents";
import Policies from "./pages/Policies";
import Scripts from "@/pages/Scripts";
import AutoHeal from "./pages/AutoHeal";
import Remediation from "./pages/Remediation";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import PermissionGuard from "./routes/PermissionGuard";


const serverErrorFallback = (
  <ErrorPage
    code="500"
    title="Something went wrong"
    message="An unexpected error occurred. Try reloading the page — if the problem continues, contact your administrator."
    actionLabel="Reload"
    actionTo="/"
  />
);

export default function App() {
  return (
    <ErrorBoundary fallback={serverErrorFallback}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={(
              <PublicRoute>
                <Login />
              </PublicRoute>
            )}
          />

          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <PermissionGuard>
                  <AppLayout />
                </PermissionGuard>
              </ProtectedRoute>
            )}
          >

            {/* main pages */}
            <Route index element={<Dashboard />} />
            <Route path="live-monitoring" element={<LiveMonitoring />} />
            <Route path="devices" element={<Devices />} />
            <Route path="devices/:id" element={<DeviceDetail />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="policies" element={<Policies />} />
            <Route path="scripts" element={<Scripts />} />
            <Route path="auto-heal" element={<AutoHeal />} />
            <Route path="remediations" element={<Remediation />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
