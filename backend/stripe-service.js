const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount, userEmail, description) {
  try {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      receipt_email: userEmail,
      description,
      metadata: { userEmail },
    });
  } catch (error) {
    console.error("Erreur Stripe:", error);
    throw error;
  }
}

async function confirmPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status === "succeeded";
  } catch (error) {
    console.error("Erreur confirmation:", error);
    return false;
  }
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
};
