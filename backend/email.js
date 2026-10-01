const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Erreur email:", error);
    return false;
  }
}

async function send2FAEmail(to, code) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Vérification 2FA</h2>
      <p>Votre code de vérification à deux facteurs est:</p>
      <h1 style="color: #667eea; letter-spacing: 5px;">${code}</h1>
      <p>Ce code expire dans 10 minutes.</p>
      <p>Si vous n'avez pas demandé cela, ignorez cet email.</p>
    </div>
  `;
  return sendEmail(to, "Code 2FA - Cartes Virtuelles", html);
}

async function sendWelcomeEmail(to, username) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Bienvenue ${username} ! 🎉</h2>
      <p>Votre compte a été créé avec succès.</p>
      <ul>
        <li>Créer des cartes virtuelles</li>
        <li>Effectuer des transactions</li>
        <li>Recharger votre compte</li>
        <li>Activer la 2FA pour plus de sécurité</li>
      </ul>
    </div>
  `;
  return sendEmail(to, "Bienvenue sur Cartes Virtuelles", html);
}

async function sendTransactionEmail(to, amount, type, cardNumber) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Confirmation de transaction</h2>
      <p><strong>Montant:</strong> ${amount} €</p>
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>Carte:</strong> •••• •••• •••• ${cardNumber.slice(-4)}</p>
      <p>Si vous ne reconnaissez pas cette transaction, contactez le support.</p>
    </div>
  `;
  return sendEmail(to, "Confirmation de transaction", html);
}

module.exports = { sendEmail, send2FAEmail, sendWelcomeEmail, sendTransactionEmail };
