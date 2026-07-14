import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Services from "./pages/Services";
import Stylists from "./pages/Stylists";
import Bookings from "./pages/Bookings";
import Appointments from "./pages/Appointments";
import StylistApproval from "./pages/StylistApproval";
import Settings from "./pages/settings";   // ✅ NEW

const App: React.FC = () => (
  <Router>
    <Routes>

      {/* LOGIN */}
      <Route path="/" element={<Login />} />

      {/* ADMIN PAGES */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/users" element={<Users />} />
      <Route path="/services" element={<Services />} />
      <Route path="/stylists" element={<Stylists />} />
      <Route path="/bookings" element={<Bookings />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/stylist-approval" element={<StylistApproval />} />

      {/* SETTINGS PAGE */}
      <Route path="/settings" element={<Settings />} />

      {/* FALLBACK */}
      <Route path="*" element={<Login />} />

    </Routes>
  </Router>
);

export default App;