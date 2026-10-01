import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function TwoFASetup({ token, onSuccess }) {
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_URL}/2fa/enable`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setStep(2);
    } catch (err) {
      setError("Erreur de configuration 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/2fa/confirm`, { secret, token: code }, { headers: { Authorization: `Bearer ${token}` } });
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: "520px", margin: "0 auto" }}>
        <h2>Configurer la 2FA</h2>

        {error && <div className="error">{error}</div>}

        {step === 1 && (
          <div style={{ marginTop: "18px" }}>
            <p>Activez la double authentification pour sécuriser votre compte.</p>
            <button className="btn btn-primary" onClick={handleEnable} disabled={loading} style={{ width: "100%", marginTop: "16px" }}>
              {loading ? "Chargement..." : "Commencer"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ marginTop: "18px" }}>
            {qrCode && (
              <div style={{ textAlign: "center", marginBottom: "18px" }}>
                <img src={qrCode} alt="QR code 2FA" style={{ maxWidth: "260px" }} />
              </div>
            )}
            <p>Clé secrète :</p>
            <code style={{ display: "block", background: "#f3f4f6", padding: "12px", borderRadius: "8px", wordBreak: "break-all" }}>{secret}</code>

            <div className="form-group" style={{ marginTop: "16px" }}>
              <label>Code à 6 chiffres</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength="6" placeholder="123456" />
            </div>

            <button className="btn btn-primary" onClick={handleVerify} disabled={loading} style={{ width: "100%" }}>
              {loading ? "Vérification..." : "Valider et activer"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="success" style={{ marginTop: "18px" }}>
            2FA activée avec succès.
          </div>
        )}
      </div>
    </div>
  );
}
