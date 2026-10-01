import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function AdminDashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, alertsRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, { headers }),
        axios.get(`${API_URL}/admin/users`, { headers }),
        axios.get(`${API_URL}/admin/fraud-alerts`, { headers }),
        axios.get(`${API_URL}/admin/audit-logs`, { headers }),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAlerts(alertsRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async (userId) => {
    try {
      await axios.put(`${API_URL}/admin/users/${userId}/block`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchAdminData();
      alert("Utilisateur bloqué");
    } catch (err) {
      alert("Erreur blocage");
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="container">
      <h2 style={{ marginBottom: "20px" }}>Admin dashboard</h2>

      <div className="flex-row" style={{ marginBottom: "20px" }}>
        <button className={`btn ${activeTab === "stats" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("stats")}>Stats</button>
        <button className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("users")}>Utilisateurs</button>
        <button className={`btn ${activeTab === "fraud" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("fraud")}>Fraudes</button>
        <button className={`btn ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("audit")}>Audit</button>
      </div>

      {activeTab === "stats" && (
        <div className="grid">
          <div className="stat-card"><h3>Utilisateurs</h3><div className="value">{stats?.total_users || 0}</div></div>
          <div className="stat-card"><h3>Cartes</h3><div className="value">{stats?.total_cards || 0}</div></div>
          <div className="stat-card"><h3>Transactions</h3><div className="value">{stats?.total_transactions || 0}</div></div>
          <div className="stat-card"><h3>Solde total</h3><div className="value">{Number(stats?.total_balance || 0).toFixed(2)} €</div></div>
          <div className="stat-card"><h3>Fraudes 24h</h3><div className="value">{stats?.recent_fraud_alerts || 0}</div></div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Solde</th>
                  <th>KYC</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{Number(user.balance || 0).toFixed(2)} €</td>
                    <td>{user.kyc_verified ? "Vérifié" : "En attente"}</td>
                    <td>{user.status}</td>
                    <td><button className="btn btn-secondary small-btn" onClick={() => blockUser(user.id)}>Bloquer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "fraud" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Risque</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? <tr><td colSpan="4">Aucune alerte.</td></tr> : alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.alert_type}</td>
                    <td>{alert.risk_score}%</td>
                    <td>{alert.description}</td>
                    <td>{new Date(alert.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Utilisateur</th>
                  <th>Ressource</th>
                  <th>IP</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? <tr><td colSpan="5">Aucune donnée.</td></tr> : logs.slice(0, 50).map((log) => (
                  <tr key={log.id}>
                    <td>{log.action}</td>
                    <td>{log.user_id}</td>
                    <td>{log.resource_type}</td>
                    <td>{log.ip_address}</td>
                    <td>{new Date(log.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
