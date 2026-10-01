import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function StripePayment({ token, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/payment/stripe`, { amount: Number(amount) }, { headers: { Authorization: `Bearer ${token}` } });
      await axios.post(`${API_URL}/payment/stripe/confirm`, { paymentIntentId: response.data.paymentIntentId }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`Paiement effectué: ${amount} €`);
      setAmount("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur Stripe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
        <h2>Paiement Stripe</h2>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: "18px" }}>
          <div className="form-group">
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Traitement..." : "Payer"}
          </button>
        </form>
      </div>
    </div>
  );
}
