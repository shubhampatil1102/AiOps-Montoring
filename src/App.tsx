import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import Incidents from "./pages/Incidents";
import Policies from "./pages/Policies";
import Scripts from "@/pages/Scripts";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>

          {/* main pages */}
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<Devices />} />
          <Route path="devices/:id" element={<DeviceDetail />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="policies" element={<Policies />} />
          <Route path="scripts" element={<Scripts />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
