export type ExpiryStatus = "expired" | "critical" | "warning" | "fresh";

export function daysUntilExpiry(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(dateStr: string): ExpiryStatus {
  const days = daysUntilExpiry(dateStr);
  if (days < 0) return "expired";
  if (days <= 2) return "critical";
  if (days <= 5) return "warning";
  return "fresh";
}
