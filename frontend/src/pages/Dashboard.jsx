import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

export default function Dashboard({ token, user }) {
  const [profile, setProfile] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, cardsRes] = await Promise.all([
          axios.get(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/cards`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setProfile(profileRes.data);
        setCards(cardsRes.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="container">
      <h2 style={{ marginBottom: "20px" }}>Tableau de bord</h2>

      <div className="grid">
        <div className="stat-card">
          <h3>Solde du compte</h3>
          <div className="value">{Number(profile?.balance || 0).toFixed(2)} €</div>
        </div>

        <div className="stat-card">
          <h3>Cartes</h3>
          <div className="value">{cards.length}</div>
        </div>

        <div className="stat-card">
          <h3>Cartes actives</h3>
          <div className="value">{cards.filter((c) => c.status === "active").length}</div>
        </div>
      </div>

      <div className="card">
        <h3>Actions rapides</h3>
        <div className="flex-row" style={{ marginTop: "16px" }}>
          <Link to="/cards"><button className="btn btn-primary">+ Créer une carte</button></Link>
          <Link to="/recharge"><button className="btn btn-primary">💰 Recharger</button></Link>
          <Link to="/transactions"><button className="btn btn-primary">📊 Historique</button></Link>
          <Link to="/bank-transfer"><button className="btn btn-primary">🏦 Virement</button></Link>
          <Link to="/kyc"><button className="btn btn-primary">🪪 KYC</button></Link>
        </div>
      </div>

      <div className="card">
        <h3>Vos cartes</h3>
        {cards.length === 0 ? (
          <p>Aucune carte créée. <Link to="/cards">Créer une carte</Link></p>
        ) : (
          <div className="card-grid" style={{ marginTop: "18px" }}>
            {cards.map((card) => (
              <div key={card.id} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "16px", color: "white", padding: "22px" }}>
                <div style={{ marginBottom: "26px" }}>
                  <p style={{ fontSize: "12px", opacity: 0.8 }}>Numéro</p>
                  <p style={{ fontSize: "18px", letterSpacing: "1.5px" }}>
                    {card.card_number.slice(0, 4)} •••• •••• {card.card_number.slice(-4)}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <p style={{ fontSize: "12px", opacity: 0.8 }}>Titulaire</p>
                    <p>{card.card_holder}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", opacity: 0.8 }}>Expiration</p>
                    <p>{card.expiry_month}/{card.expiry_year}</p>
                  </div>
                </div>

                <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: "16px" }}>
                  <p style={{ fontSize: "12px", opacity: 0.8 }}>Solde</p>
                  <p style={{ fontSize: "20px", fontWeight: "bold" }}>{Number(card.balance || 0).toFixed(2)} €</p>
                  <span style={{ display: "inline-block", marginTop: "10px", background: card.status === "active" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)", borderRadius: "999px", padding: "6px 12px", fontSize: "12px" }}>
                    {card.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
