import dotenv from 'dotenv';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const envTestPath = resolve(projectRoot, '.env.test');

dotenv.config({ path: envTestPath });

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret?.startsWith('sk_test_')) {
  console.error('[resolve-prices] STRIPE_SECRET_KEY test mode missing in .env.test');
  process.exit(1);
}

const MONTHLY_PRODUCT = 'prod_ULpg8TGC5uaQK8';
const ANNUAL_PRODUCT = 'prod_ULphvC81gE7cIB';

async function listPrices(productId) {
  const url = `https://api.stripe.com/v1/prices?product=${productId}&active=true&limit=20`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  if (!res.ok) throw new Error(`Stripe API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data;
}

const [monthlyPrices, annualPrices] = await Promise.all([
  listPrices(MONTHLY_PRODUCT),
  listPrices(ANNUAL_PRODUCT),
]);

function pickPrice(prices, expectedInterval, expectedAmount) {
  return prices.find(
    (p) =>
      p.recurring?.interval === expectedInterval &&
      p.unit_amount === expectedAmount &&
      p.currency === 'eur',
  );
}

const monthly = pickPrice(monthlyPrices, 'month', 3900);
const annual = pickPrice(annualPrices, 'year', 39000);

if (!monthly) {
  console.error(`[resolve-prices] No 39 EUR/month EUR price on ${MONTHLY_PRODUCT}. Prices trouves:`);
  monthlyPrices.forEach((p) => console.error(`  - ${p.id} ${p.unit_amount/100} ${p.currency} ${p.recurring?.interval}`));
  process.exit(1);
}
if (!annual) {
  console.error(`[resolve-prices] No 390 EUR/year EUR price on ${ANNUAL_PRODUCT}. Prices trouves:`);
  annualPrices.forEach((p) => console.error(`  - ${p.id} ${p.unit_amount/100} ${p.currency} ${p.recurring?.interval}`));
  process.exit(1);
}

let env = fs.readFileSync(envTestPath, 'utf8');
env = env.replace(/^STRIPE_PRICE_ID=.*$/m, `STRIPE_PRICE_ID=${monthly.id}`);
env = env.replace(/^STRIPE_PRICE_ID_ANNUAL=.*$/m, `STRIPE_PRICE_ID_ANNUAL=${annual.id}`);
fs.writeFileSync(envTestPath, env);

console.log(`[resolve-prices] OK`);
console.log(`  STRIPE_PRICE_ID=${monthly.id}          (39 EUR/mois)`);
console.log(`  STRIPE_PRICE_ID_ANNUAL=${annual.id}    (390 EUR/an)`);
