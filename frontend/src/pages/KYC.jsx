import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function KYC({ token }) {
  const [documentType, setDocumentType] = useState("passport");
  const [documentUrl, setDocumentUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/kyc/submit`, { documentType, documentUrl }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess("Document envoyé pour vérification");
      setDocumentUrl("");
    } catch (err) {
      setError(err.response?.data?.error || "Erreur KYC");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: "540px", margin: "0 auto" }}>
        <h2>Vérification KYC</h2>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: "18px" }}>
          <div className="form-group">
            <label>Type de document</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="passport">Passeport</option>
              <option value="id_card">Carte d'identité</option>
              <option value="driver_license">Permis de conduire</option>
            </select>
          </div>

          <div className="form-group">
            <label>URL du document</label>
            <input type="url" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://..." required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Soumission..." : "Soumettre"}
          </button>
        </form>
      </div>
    </div>
  );
}
