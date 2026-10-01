import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Cards({ token }) {
  const [cards, setCards] = useState([]);
  const [cardHolder, setCardHolder] = useState("");
  const [cardType, setCardType] = useState("Visa");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/cards`, { headers: { Authorization: `Bearer ${token}` } });
      setCards(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/cards`, { card_holder: cardHolder, card_type: cardType }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess("Carte créée avec succès");
      setCardHolder("");
      setCardType("Visa");
      fetchCards();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur de création");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette carte ?")) return;

    try {
      await axios.delete(`${API_URL}/cards/${cardId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess("Carte supprimée");
      fetchCards();
    } catch (err) {
      setError("Erreur lors de la suppression");
    }
  };

  const handleToggleStatus = async (cardId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await axios.put(`${API_URL}/cards/${cardId}/status`, { status: nextStatus }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`Carte ${nextStatus === "active" ? "activée" : "désactivée"}`);
      fetchCards();
    } catch (err) {
      setError("Erreur lors du changement de statut");
    }
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: "20px" }}>Gérer les cartes</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h3>Créer une carte virtuelle</h3>
        <form onSubmit={handleCreateCard} style={{ marginTop: "18px" }}>
          <div className="form-group">
            <label>Nom du titulaire</label>
            <input type="text" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Type</label>
            <select value={cardType} onChange={(e) => setCardType(e.target.value)}>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="American Express">American Express</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Création..." : "Créer la carte"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Liste des cartes</h3>
        {cards.length === 0 ? (
          <p>Aucune carte.</p>
        ) : (
          <div className="card-grid" style={{ marginTop: "16px" }}>
            {cards.map((card) => (
              <div key={card.id} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "18px" }}>
                <h4>{card.card_holder}</h4>
                <p><strong>Numéro:</strong> {card.card_number.slice(0, 4)} •••• •••• {card.card_number.slice(-4)}</p>
                <p><strong>Type:</strong> {card.card_type}</p>
                <p><strong>Expiration:</strong> {card.expiry_month}/{card.expiry_year}</p>
                <p><strong>CVV:</strong> {card.cvv}</p>
                <p><strong>Solde:</strong> {Number(card.balance || 0).toFixed(2)} €</p>
                <p><strong>Statut:</strong> {card.status === "active" ? "Active" : "Inactive"}</p>

                <div className="flex-row" style={{ marginTop: "14px" }}>
                  <button className="btn btn-primary small-btn" onClick={() => handleToggleStatus(card.id, card.status)}>
                    {card.status === "active" ? "Désactiver" : "Activer"}
                  </button>
                  <button className="btn btn-secondary small-btn" onClick={() => handleDeleteCard(card.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
