import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function BankTransfer({ token }) {
  const [transfers, setTransfers] = useState([]);
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [bankName, setBankName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await axios.get(`${API_URL}/bank-transfers`, { headers: { Authorization: `Bearer ${token}` } });
      setTransfers(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/bank-transfer`, { amount: Number(amount), iban, swift, bankName }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`Virement initié. Référence: ${response.data.id}`);
      setAmount("");
      setIban("");
      setSwift("");
      setBankName("");
      fetchTransfers();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur de virement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: "20px" }}>Virement bancaire</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="grid">
        <div className="card">
          <h3>Créer un virement</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: "18px" }}>
            <div className="form-group">
              <label>Montant (€)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>IBAN</label>
              <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>SWIFT</label>
              <input type="text" value={swift} onChange={(e) => setSwift(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Banque</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Traitement..." : "Envoyer le virement"}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Historique</h3>
          {transfers.length === 0 ? (
            <p>Aucun virement.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
              {transfers.map((transfer) => (
                <div key={transfer.id} style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{Number(transfer.amount).toFixed(2)} €</strong>
                    <span>{transfer.status}</span>
                  </div>
                  <p>{transfer.bank_name}</p>
                  <small>{transfer.bank_account}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
