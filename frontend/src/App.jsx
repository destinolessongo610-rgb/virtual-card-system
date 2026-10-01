import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Cards from "./pages/Cards";
import Transactions from "./pages/Transactions";
import Recharge from "./pages/Recharge";
import TwoFASetup from "./pages/TwoFASetup";
import AdminDashboard from "./pages/AdminDashboard";
import BankTransfer from "./pages/BankTransfer";
import KYC from "./pages/KYC";
import StripePayment from "./pages/StripePayment";
import Header from "./components/Header";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    }
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <Router>
      {token && <Header user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login setToken={setToken} setUser={setUser} />} />
        <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/dashboard" element={token ? <Dashboard token={token} user={user} /> : <Navigate to="/login" />} />
        <Route path="/cards" element={token ? <Cards token={token} /> : <Navigate to="/login" />} />
        <Route path="/transactions" element={token ? <Transactions token={token} /> : <Navigate to="/login" />} />
        <Route path="/recharge" element={token ? <Recharge token={token} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/2fa-setup" element={token ? <TwoFASetup token={token} onSuccess={() => window.location.reload()} /> : <Navigate to="/login" />} />
        <Route path="/kyc" element={token ? <KYC token={token} /> : <Navigate to="/login" />} />
        <Route path="/bank-transfer" element={token ? <BankTransfer token={token} /> : <Navigate to="/login" />} />
        <Route path="/stripe-payment" element={token ? <StripePayment token={token} onSuccess={() => window.location.reload()} /> : <Navigate to="/login" />} />
        {user?.role === "admin" && <Route path="/admin" element={token ? <AdminDashboard token={token} /> : <Navigate to="/login" />} />}
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
