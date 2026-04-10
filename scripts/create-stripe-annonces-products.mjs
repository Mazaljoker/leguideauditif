/**
 * Script one-shot : cree les 6 produits Stripe pour les annonces.
 * Usage : node scripts/create-stripe-annonces-products.mjs
 * Prerequis : STRIPE_SECRET_KEY dans .env
 */

import Stripe from 'stripe';
import { readFileSync } from 'fs';

// Charger .env manuellement (pas de dotenv en dep)
const envContent = readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const stripeKey = envVars.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY non trouve dans .env');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

const products = [
  { name: 'Debloquer contacts annonce', amount: 900, envKey: 'STRIPE_PRICE_UNLOCK_CONTACTS' },
  { name: 'Annonce Premium', amount: 2900, envKey: 'STRIPE_PRICE_PREMIUM_ANNONCE' },
  { name: 'Boost annonce 1 semaine', amount: 900, envKey: 'STRIPE_PRICE_BOOST_SEMAINE' },
  { name: 'Alerte ciblee annonce', amount: 1900, envKey: 'STRIPE_PRICE_ALERTE_CIBLEE' },
  { name: 'Pack Cession Standard', amount: 9900, envKey: 'STRIPE_PRICE_PACK_CESSION' },
  { name: 'Pack Cession Accompagne', amount: 34900, envKey: 'STRIPE_PRICE_PACK_CESSION_ACCOMP' },
];

console.log('Creation des produits Stripe pour les annonces...\n');

const envLines = [];

for (const p of products) {
  const product = await stripe.products.create({
    name: p.name,
    metadata: { module: 'annonces', site: 'leguideauditif.fr' },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: p.amount,
    currency: 'eur',
    metadata: { module: 'annonces' },
  });

  const line = `${p.envKey}=${price.id}`;
  envLines.push(line);
  console.log(`  ${p.name} (${(p.amount / 100).toFixed(2)} EUR) -> ${price.id}`);
}

console.log('\n--- Ajouter ces lignes dans .env ---\n');
console.log(envLines.join('\n'));
console.log('\n--- Fin ---');
