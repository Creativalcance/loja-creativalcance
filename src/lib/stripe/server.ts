import Stripe from "stripe";

export function createStripeServerClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY não está configurada.");
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
    typescript: true,
  });
}