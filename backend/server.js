require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const { encrypt } = require("./crypto");
const { sendWelcomeEmail, sendTransactionEmail } = require("./email");
const { createPaymentIntent, confirmPayment } = require("./stripe-service");
const { generateSecret, generateQRCode, verifyToken } = require("./two-fa");
const { calculateRiskScore, shouldBlockTransaction } = require("./fraud-detection");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_change_me";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@virtualcards.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminSecure123!";

app.use(cors());
app.use(express.json());

function logAudit(userId, action, resourceType, resourceId, details, ipAddress) {
  db.run(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, resourceType, resourceId, JSON.stringify(details || {}), ipAddress || "unknown"]
  );
}

function ensureDefaultAdmin() {
  db.get(`SELECT id FROM users WHERE email = ?`, [ADMIN_EMAIL], (err, user) => {
    if (err || user) return;

    const hashedPassword = bcryptjs.hashSync(ADMIN_PASSWORD, 10);
    db.run(
      `INSERT INTO users (username, email, password, fullname, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["admin", ADMIN_EMAIL, hashedPassword, "Administrateur", "admin", "active"],
      function (err) {
        if (!err) {
          console.log("✅ Admin créé:", ADMIN_EMAIL);
        }
      }
    );
  });
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token invalide" });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès administrateur requis" });
  }
  next();
};

app.post("/api/auth/register", (req, res) => {
  const { username, email, password, fullname } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Les champs requis sont manquants" });
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, email, password, fullname)
     VALUES (?, ?, ?, ?)`,
    [username, email, hashedPassword, fullname || ""],
    async function (err) {
      if (err) {
        return res.status(400).json({ error: "Utilisateur déjà existant" });
      }

      await sendWelcomeEmail(email, username);
      logAudit(this.lastID, "USER_REGISTERED", "users", this.lastID, { username, email }, req.ip);

      res.status(201).json({
        id: this.lastID,
        username,
        email,
        fullname: fullname || "",
      });
    }
  );
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "Identifiants incorrects" });
    }

    if (!bcryptjs.compareSync(password, user.password)) {
      return res.status(400).json({ error: "Identifiants incorrects" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "Compte désactivé" });
    }

    if (user.two_fa_enabled) {
      return res.json({
        requiresTwoFA: true,
        userId: user.id,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || "user" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    logAudit(user.id, "USER_LOGIN", "users", user.id, {}, req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullname: user.fullname,
        balance: user.balance,
        role: user.role || "user",
      },
    });
  });
});

app.post("/api/2fa/enable", authenticateToken, async (req, res) => {
  const secret = generateSecret(req.user.email);
  const qrCode = await generateQRCode(secret);

  res.json({
    secret: secret.base32,
    qrCode,
    message: "Scannez le code QR avec votre appli d'authentification",
  });
});

app.post("/api/2fa/confirm", authenticateToken, (req, res) => {
  const { secret, token } = req.body;

  if (!verifyToken(secret, token)) {
    return res.status(400).json({ error: "Code 2FA invalide" });
  }

  db.run(
    `UPDATE users SET two_fa_enabled = 1, two_fa_secret = ? WHERE id = ?`,
    [secret, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: "2FA activé avec succès" });
    }
  );
});

app.post("/api/2fa/verify-login", (req, res) => {
  const { userId, token } = req.body;

  db.get(`SELECT email, two_fa_secret FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "Utilisateur introuvable" });
    }

    if (!verifyToken(user.two_fa_secret, token)) {
      return res.status(400).json({ error: "Code 2FA invalide" });
    }

    const appToken = jwt.sign({ id: userId, email: user.email }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token: appToken, message: "Connexion vérifiée" });
  });
});

app.get("/api/user/profile", authenticateToken, (req, res) => {
  db.get(
    `SELECT id, username, email, fullname, balance, two_fa_enabled, kyc_verified, role, created_at FROM users WHERE id = ?`,
    [req.user.id],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      res.json(user);
    }
  );
});

app.post("/api/cards", authenticateToken, (req, res) => {
  const { card_holder, card_type } = req.body;
  const user_id = req.user.id;

  if (!card_holder) {
    return res.status(400).json({ error: "Nom du titulaire requis" });
  }

  const cardNumber = (() => {
    let value = "4532";
    for (let i = 0; i < 12; i++) value += Math.floor(Math.random() * 10);
    return value;
  })();

  const cvv = String(Math.floor(100 + Math.random() * 900));
  const expiryMonth = new Date().getMonth() + 1;
  const expiryYear = new Date().getFullYear() + 3;
  const encryptedNumber = encrypt(cardNumber);

  db.run(
    `INSERT INTO cards (user_id, card_number, encrypted_number, card_holder, expiry_month, expiry_year, cvv, card_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, cardNumber, encryptedNumber, card_holder, expiryMonth, expiryYear, cvv, card_type || "Visa"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      logAudit(user_id, "CARD_CREATED", "cards", this.lastID, { card_holder }, req.ip);

      res.status(201).json({
        id: this.lastID,
        card_number: cardNumber,
        card_holder,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv,
        balance: 0,
        status: "active",
        card_type: card_type || "Visa",
      });
    }
  );
});

app.get("/api/cards", authenticateToken, (req, res) => {
  db.all(
    `SELECT id, card_number, card_holder, expiry_month, expiry_year, cvv, balance, status, card_type, daily_limit, monthly_limit, created_at
     FROM cards WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id],
    (err, cards) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(cards);
    }
  );
});

app.delete("/api/cards/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM cards WHERE id = ? AND user_id = ?`,
    [id, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Carte non trouvée" });
      }
      logAudit(req.user.id, "CARD_DELETED", "cards", id, {}, req.ip);
      res.json({ success: true });
    }
  );
});

app.put("/api/cards/:id/status", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "inactive", "blocked"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  db.run(
    `UPDATE cards SET status = ? WHERE id = ? AND user_id = ?`,
    [status, id, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Carte non trouvée" });
      }
      res.json({ success: true, status });
    }
  );
});

app.post("/api/recharge", authenticateToken, (req, res) => {
  const { amount, method } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  db.run(
    `INSERT INTO recharges (user_id, amount, method, status) VALUES (?, ?, ?, ?)`,
    [req.user.id, amount, method || "card", "completed"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.run(
        `UPDATE users SET balance = balance + ? WHERE id = ?`,
        [amount, req.user.id],
        (err2) => {
          if (err2) {
            return res.status(500).json({ error: err2.message });
          }

          logAudit(req.user.id, "RECHARGE", "recharges", this.lastID, { amount, method }, req.ip);

          res.status(201).json({
            id: this.lastID,
            amount,
            method: method || "card",
            status: "completed",
          });
        }
      );
    }
  );
});

app.post("/api/payment/stripe", authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  try {
    const paymentIntent = await createPaymentIntent(amount, req.user.email, "Recharge compte virtuel");
    db.run(
      `INSERT INTO recharges (user_id, amount, method, stripe_payment_intent_id) VALUES (?, ?, ?, ?)`,
      [req.user.id, amount, "stripe", paymentIntent.id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/payment/stripe/confirm", authenticateToken, async (req, res) => {
  const { paymentIntentId } = req.body;

  try {
    const isSuccessful = await confirmPayment(paymentIntentId);
    if (!isSuccessful) {
      return res.status(400).json({ error: "Paiement échoué" });
    }

    db.get(`SELECT * FROM recharges WHERE stripe_payment_intent_id = ?`, [paymentIntentId], (err, recharge) => {
      if (err || !recharge) {
        return res.status(404).json({ error: "Recharge non trouvée" });
      }

      db.run(
        `UPDATE users SET balance = balance + ? WHERE id = ?`,
        [recharge.amount, req.user.id],
        function (err2) {
          if (err2) {
            return res.status(500).json({ error: err2.message });
          }

          db.run(
            `UPDATE recharges SET status = 'completed' WHERE id = ?`,
            [recharge.id],
            (err3) => {
              if (err3) {
                return res.status(500).json({ error: err3.message });
              }
              res.json({ success: true, message: `${recharge.amount} € crédités` });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/bank-transfer", authenticateToken, (req, res) => {
  const { amount, iban, swift, bankName } = req.body;

  if (!amount || !iban || !bankName) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  db.run(
    `INSERT INTO bank_transfers (user_id, amount, bank_account, bank_name, iban, swift_code, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, amount, "****" + iban.slice(-4), bankName, iban, swift || "", "pending"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      logAudit(req.user.id, "BANK_TRANSFER_INITIATED", "bank_transfers", this.lastID, { amount, bankName }, req.ip);
      res.status(201).json({ id: this.lastID, amount, status: "pending", message: "Virement en cours" });
    }
  );
});

app.get("/api/bank-transfers", authenticateToken, (req, res) => {
  db.all(
    `SELECT id, amount, bank_account, bank_name, status, created_at FROM bank_transfers WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id],
    (err, transfers) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(transfers);
    }
  );
});

app.post("/api/kyc/submit", authenticateToken, (req, res) => {
  const { documentType, documentUrl } = req.body;

  if (!documentType || !documentUrl) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  db.run(
    `INSERT INTO kyc_documents (user_id, document_type, document_url)
     VALUES (?, ?, ?)`,
    [req.user.id, documentType, documentUrl],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      logAudit(req.user.id, "KYC_SUBMITTED", "kyc_documents", this.lastID, { documentType }, req.ip);
      res.status(201).json({ id: this.lastID, status: "pending", message: "Document soumis pour vérification" });
    }
  );
});

app.put("/api/kyc/:id/verify", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;

  if (approved) {
    db.run(
      `UPDATE kyc_documents SET status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.run(
          `UPDATE users SET kyc_verified = 1 WHERE id = (SELECT user_id FROM kyc_documents WHERE id = ?)`,
          [id],
          function (err2) {
            if (err2) {
              return res.status(500).json({ error: err2.message });
            }
            logAudit(req.user.id, "KYC_VERIFIED", "kyc_documents", id, { approved: true }, req.ip);
            res.json({ success: true, message: "KYC approuvé" });
          }
        );
      }
    );
  } else {
    db.run(
      `UPDATE kyc_documents SET status = 'rejected' WHERE id = ?`,
      [id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        logAudit(req.user.id, "KYC_REJECTED", "kyc_documents", id, { approved: false }, req.ip);
        res.json({ success: true, message: "KYC rejeté" });
      }
    );
  }
});

app.post("/api/transactions", authenticateToken, (req, res) => {
  const { card_id, amount, description } = req.body;
  const user_id = req.user.id;

  if (!card_id || !amount || amount <= 0) {
    return res.status(400).json({ error: "Données invalides" });
  }

  db.all(
    `SELECT * FROM transactions WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`,
    [user_id],
    async (err, recentTransactions) => {
      const riskScore = calculateRiskScore({ amount }, recentTransactions, req.ip);

      if (shouldBlockTransaction(riskScore)) {
        db.run(
          `INSERT INTO fraud_alerts (user_id, alert_type, risk_score, description, action_taken)
           VALUES (?, ?, ?, ?, ?)`,
          [user_id, "high_risk_transaction", riskScore, `Montant: ${amount}€`, "blocked"],
          () => {}
        );

        return res.status(403).json({ error: "Transaction bloquée pour raison de sécurité", riskScore });
      }

      db.get(
        `SELECT balance, status FROM cards WHERE id = ? AND user_id = ?`,
        [card_id, user_id],
        (err2, card) => {
          if (err2 || !card) {
            return res.status(404).json({ error: "Carte non trouvée" });
          }

          if (card.status !== "active") {
            return res.status(400).json({ error: "Carte non active" });
          }

          if (Number(card.balance) < Number(amount)) {
            return res.status(400).json({ error: "Solde insuffisant" });
          }

          db.run(
            `INSERT INTO transactions (card_id, user_id, type, amount, description, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [card_id, user_id, "debit", amount, description || "", "completed"],
            function (err3) {
              if (err3) {
                return res.status(500).json({ error: err3.message });
              }

              db.run(
                `UPDATE cards SET balance = balance - ? WHERE id = ?`,
                [amount, card_id],
                async (err4) => {
                  if (err4) {
                    return res.status(500).json({ error: err4.message });
                  }

                  await sendTransactionEmail(req.user.email, amount, "Débit", String(card_id));
                  logAudit(user_id, "TRANSACTION_DEBIT", "transactions", this.lastID, { amount, cardId: card_id }, req.ip);

                  res.status(201).json({
                    id: this.lastID,
                    card_id,
                    type: "debit",
                    amount,
                    description: description || "",
                    status: "completed",
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.post("/api/transactions/credit", authenticateToken, (req, res) => {
  const { card_id, amount, description } = req.body;
  const user_id = req.user.id;

  if (!card_id || !amount || amount <= 0) {
    return res.status(400).json({ error: "Données invalides" });
  }

  db.get(`SELECT balance FROM users WHERE id = ?`, [user_id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    if (Number(user.balance) < Number(amount)) {
      return res.status(400).json({ error: "Solde compte insuffisant" });
    }

    db.run(
      `INSERT INTO transactions (card_id, user_id, type, amount, description, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [card_id, user_id, "credit", amount, description || "", "completed"],
      function (err2) {
        if (err2) {
          return res.status(500).json({ error: err2.message });
        }

        db.run(
          `UPDATE cards SET balance = balance + ? WHERE id = ? AND user_id = ?`,
          [amount, card_id, user_id],
          (err3) => {
            if (err3) {
              return res.status(500).json({ error: err3.message });
            }

            db.run(
              `UPDATE users SET balance = balance - ? WHERE id = ?`,
              [amount, user_id],
              (err4) => {
                if (err4) {
                  return res.status(500).json({ error: err4.message });
                }

                logAudit(user_id, "TRANSACTION_CREDIT", "transactions", this.lastID, { amount, cardId: card_id }, req.ip);
                res.status(201).json({
                  id: this.lastID,
                  card_id,
                  type: "credit",
                  amount,
                  status: "completed",
                });
              }
            );
          }
        );
      }
    );
  });
});

app.get("/api/transactions", authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
    [req.user.id],
    (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(transactions);
    }
  );
});

app.get("/api/admin/users", authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT id, username, email, fullname, balance, kyc_verified, status, created_at FROM users`,
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(users);
    }
  );
});

app.get("/api/admin/fraud-alerts", authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT * FROM fraud_alerts ORDER BY created_at DESC LIMIT 100`,
    [],
    (err, alerts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(alerts);
    }
  );
});

app.get("/api/admin/audit-logs", authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200`,
    [],
    (err, logs) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(logs);
    }
  );
});

app.put("/api/admin/users/:id/block", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE users SET status = 'blocked' WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      logAudit(req.user.id, "USER_BLOCKED", "users", id, {}, req.ip);
      res.json({ success: true, message: "Utilisateur bloqué" });
    }
  );
});

app.get("/api/admin/stats", authenticateToken, requireAdmin, (req, res) => {
  db.get(
    `SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM cards) as total_cards,
      (SELECT COUNT(*) FROM transactions) as total_transactions,
      (SELECT COALESCE(SUM(balance), 0) FROM users) as total_balance,
      (SELECT COUNT(*) FROM fraud_alerts WHERE created_at > datetime('now', '-24 hours')) as recent_fraud_alerts
    `,
    [],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(stats || {});
    }
  );
});

ensureDefaultAdmin();

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
