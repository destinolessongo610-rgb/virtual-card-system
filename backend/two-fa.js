const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const { send2FAEmail } = require("./email");

function generateSecret(email) {
  return speakeasy.generateSecret({
    name: `Virtual Cards (${email})`,
    issuer: "Virtual Cards",
    length: 32,
  });
}

async function generateQRCode(secret) {
  try {
    return await QRCode.toDataURL(secret.otpauth_url);
  } catch (error) {
    console.error("Erreur QR:", error);
    return null;
  }
}

function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2,
  });
}

function generateEmailCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function send2FACode(email) {
  const code = generateEmailCode();
  const success = await send2FAEmail(email, code);
  return { success, code };
}

module.exports = {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateEmailCode,
  send2FACode,
};
