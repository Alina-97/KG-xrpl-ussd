// Things the website AND the scripts both need.
export const APP_NAME = 'ShebiSpark';
export const TAGLINE = 'Power that tops itself up.';

// One entry per service. A "step" is one small purchase.
// 1 XRP = 1,000,000 drops. Prices are demo prices.
export const SERVICES = {
  POWER: { label: 'Power', unit: 'kWh', stepUnits: 2, stepDrops: 200000, low: 2, start: 4, useUnits: 1 },
  WATER: { label: 'Water', unit: 'L', stepUnits: 50, stepDrops: 100000, low: 20, start: 100, useUnits: 10 },
  WIFI: { label: 'Wi-Fi', unit: 'MB', stepUnits: 100, stepDrops: 100000, low: 50, start: 300, useUnits: 20 },
};

export const KASI_PER_STEP = 1; // loyalty points earned per purchase
export const KASI_TO_REDEEM = 10; // points needed for free power
export const REDEEM_UNITS = 2; // free kWh for those points
export const ALLOWED_TOPUPS = [5, 10, 20]; // XRP an owner may add at one time
export const DAILY_TOPUP_LIMIT = 50; // XRP per meter per day
export const TF_CLOSE = 0x00020000; // PaymentChannelClaim "close" flag

// XRPL only allows 3-letter currency codes as plain text.
// "KASI" has 4 letters, so it must be sent as a 40-character hex code.
export function currencyHex(code) {
  if (code.length === 3) return code;
  return Buffer.from(code, 'ascii').toString('hex').toUpperCase().padEnd(40, '0');
}
export const KASI_CODE = currencyHex('KASI');
