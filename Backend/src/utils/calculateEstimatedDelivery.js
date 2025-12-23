export function calculateEstimatedDelivery({ minDays, maxDays }) {
  const today = new Date();

  // Usamos el máximo para ser conservadores
  const estimatedDate = new Date(today);
  estimatedDate.setDate(today.getDate() + maxDays);

  return estimatedDate;
}
