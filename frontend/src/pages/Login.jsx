import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Login({ setToken, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });

      if (response.data.requiresTwoFA) {
        setTwoFARequired(true);
        setUserId(response.data.userId);
        setLoading(false);
        return;
      }

      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setToken(token);
      setUser(user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFA = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/2fa/verify-login`, { userId, token: code });
      const { token, user } = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${response.data.token}` },
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify({ ...user.data, role: user.data.role || "user" }));
      setToken(response.data.token);
      setUser({ ...user.data, role: user.data.role || "user" });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Code 2FA invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-box">
        <h2>Connexion</h2>

        {error && <div className="error">{error}</div>}

        {!twoFARequired ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        ) : (
          <div>
            <div className="form-group">
              <label>Code 2FA</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength="6" />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleTwoFA} disabled={loading}>
              {loading ? "Vérification..." : "Valider le code"}
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: "18px" }}>
          Pas encore inscrit ? <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
