// Change the name here once it's decided — every page reads it from this file.
export const APP_NAME = "Graft";

// Commercial terms shown in the UI. The Stripe price (STRIPE_PRICE_MONTHLY) must match MONTHLY_PRICE_PENCE.
export const MONTHLY_PRICE_PENCE = 999;
export const TRIAL_DAYS = 7;
/** Coach commission on each subscriber's monthly revenue, in basis points (1000 = 10%). */
export const COACH_SHARE_BPS = 1000;

export const formatPence = (p: number) => `£${(p / 100).toFixed(2)}`;
export const percent = (bps: number) => `${bps / 100}%`;
