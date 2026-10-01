import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Transactions({ token }) {
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("credit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCards();
    fetchTransactions();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/cards`, { headers: { Authorization: `Bearer ${token}` } });
      setCards(response.data);
      if (response.data.length > 0) setSelectedCardId(response.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_URL}/transactions`, { headers: { Authorization: `Bearer ${token}` } });
      setTransactions(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const endpoint = type === "credit" ? `${API_URL}/transactions/credit` : `${API_URL}/transactions`;
      await axios.post(
        endpoint,
        { card_id: Number(selectedCardId), amount: Number(amount), description },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Transaction effectuée: ${amount} €`);
      setAmount("");
      setDescription("");
      fetchCards();
      fetchTransactions();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: "20px" }}>Transactions</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h3>Effectuer une transaction</h3>
        {cards.length === 0 ? (
          <p>Créez d’abord une carte.</p>
        ) : (
          <form onSubmit={handleTransaction} style={{ marginTop: "18px" }}>
            <div className="form-group">
              <label>Carte</label>
              <select value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value)}>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>{card.card_holder} - {card.card_number.slice(-4)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="credit">Crédit</option>
                <option value="debit">Débit</option>
              </select>
            </div>

            <div className="form-group">
              <label>Montant (€)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Achat en ligne" />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Traitement..." : "Effectuer la transaction"}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Historique</h3>
        <div className="table-wrap" style={{ marginTop: "18px" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Description</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="5">Aucune transaction.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleDateString("fr-FR")}</td>
                    <td>{tx.type === "credit" ? "Crédit" : "Débit"}</td>
                    <td style={{ color: tx.type === "credit" ? "green" : "red", fontWeight: "bold" }}>
                      {tx.type === "credit" ? "+" : "-"}{Number(tx.amount).toFixed(2)} €
                    </td>
                    <td>{tx.description || "-"}</td>
                    <td>{tx.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
