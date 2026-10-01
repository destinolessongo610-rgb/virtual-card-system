import { Link } from "react-router-dom";

export default function Header({ user, onLogout }) {
  return (
    <div className="header">
      <h1>🎴 Cartes Virtuelles Pro</h1>
      <div className="header-right">
        <Link to="/dashboard">Tableau de bord</Link>
        <Link to="/cards">Cartes</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/recharge">Recharge</Link>
        <Link to="/bank-transfer">Virements</Link>
        <Link to="/kyc">KYC</Link>
        <Link to="/2fa-setup">🔐 2FA</Link>
        {user?.role === "admin" && <Link to="/admin">👨‍💼 Admin</Link>}
        <span>|</span>
        <span>{user?.username}</span>
        <button className="btn btn-secondary" onClick={onLogout}>Déconnexion</button>
      </div>
    </div>
  );
}
