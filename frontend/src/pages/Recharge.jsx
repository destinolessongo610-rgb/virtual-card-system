import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Recharge({ token, setUser }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecharge = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/recharge`, { amount: Number(amount), method }, { headers: { Authorization: `Bearer ${token}` } });
      const profileRes = await axios.get(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
      setUser(profileRes.data);
      setSuccess(`Recharge de ${amount} € effectuée`);
      setAmount("");
    } catch (err) {
      setError(err.response?.data?.error || "Erreur de recharge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: "20px" }}>Recharger votre compte</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card" style={{ maxWidth: "520px", margin: "0 auto" }}>
        <form onSubmit={handleRecharge}>
          <div className="form-group">
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Méthode</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="card">Carte bancaire</option>
              <option value="virement">Virement</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Recharge..." : "Recharger"}
          </button>
        </form>
      </div>
    </div>
  );
}
