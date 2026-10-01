function calculateRiskScore(transaction, userHistory = [], ipAddress = "") {
  let riskScore = 0;

  if (userHistory.length > 0) {
    const avgAmount = userHistory.reduce((sum, t) => sum + Number(t.amount || 0), 0) / userHistory.length;
    if (Number(transaction.amount) > avgAmount * 3) {
      riskScore += 30;
    }
  }

  if (userHistory.length > 10) {
    riskScore += 20;
  }

  if (Number(transaction.amount) > 5000) {
    riskScore += 40;
  }

  if (ipAddress && ipAddress.includes("127.0.0.1")) {
    riskScore += 10;
  }

  return Math.min(riskScore, 100);
}

function shouldBlockTransaction(riskScore) {
  return riskScore > 75;
}

module.exports = { calculateRiskScore, shouldBlockTransaction };
