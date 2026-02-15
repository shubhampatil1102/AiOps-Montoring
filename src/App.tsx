import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Incidents from "./pages/Incidents";
import Policies from "./pages/Policies";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<Devices />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="policies" element={<Policies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
