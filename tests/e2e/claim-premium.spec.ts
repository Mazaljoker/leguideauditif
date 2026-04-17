import { test, expect } from '@playwright/test';
import {
  resetCentre,
  getCentre,
  generateAdminToken,
  TEST_SLUG,
  TEST_EMAIL,
  TEST_SUBSCRIPTION_ID,
  TEST_CUSTOMER_ID,
} from './helpers/centre-state';
import {
  postSignedWebhook,
  buildCheckoutCompletedEvent,
  buildSubscriptionDeletedEvent,
} from './helpers/stripe-webhook';

const CENTRE_URL = `/centre/${TEST_SLUG}/`;
const CLAIM_FORM_URL = `/revendiquer-gratuit/?centre=${TEST_SLUG}`;
const PREMIUM_FORM_URL = `/revendiquer/?centre=${TEST_SLUG}`;

test.describe('Fiche centre — parcours complet revendication + premium', () => {
  test('1. Ghost (rpps) : banner alerte + CTA revendiquer + badge non-revendique', async ({ page }) => {
    await resetCentre('rpps');
    await page.goto(CENTRE_URL);

    await expect(page.getByRole('alert').first()).toContainText(/Cette fiche n'a pas/i);
    await expect(page.getByRole('region', { name: 'Revendiquer cette fiche' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Completer ma fiche gratuitement/i })).toBeVisible();
    await expect(page.locator('body')).toContainText(/Non revendiqu/i);
    await expect(page.getByRole('region', { name: 'Passer en premium' })).toHaveCount(0);
  });

  test('2. Claim submit : form → DB pending → redirect confirmation', async ({ page }) => {
    await resetCentre('rpps');
    await page.goto(CENTRE_URL);

    await page.getByRole('link', { name: /Completer ma fiche gratuitement/i }).click();
    await expect(page).toHaveURL(new RegExp(`/revendiquer-gratuit/\\?centre=${TEST_SLUG}`));

    await page.fill('#claim-nom', 'Chabbat');
    await page.fill('#claim-prenom', 'Franck-Olivier');
    await page.fill('#claim-email', TEST_EMAIL);
    await page.fill('#claim-adeli', '12345678901');
    await page.check('input[name="rgpd"]');

    const [claimResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/claim') && r.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: /Revendiquer gratuitement/i }).click(),
    ]);
    expect(claimResponse.status()).toBe(200);
    await page.waitForURL(/\/revendiquer-gratuit\/confirmation/, { timeout: 30_000 });

    const centre = await getCentre();
    expect(centre.claim_status).toBe('pending');
    expect(centre.claimed_by_email).toBe(TEST_EMAIL);
    expect(centre.claimed_by_adeli).toBe('12345678901');
    expect(centre.rpps).toBe('12345678901');
  });

  test('3. Pending : banner "Verification en cours" + CTA masque', async ({ page }) => {
    await resetCentre('pending');
    await page.goto(CENTRE_URL);

    await expect(page.getByText(/V[ée]rification en cours/i)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Revendiquer cette fiche' })).toHaveCount(0);
  });

  test('4. Admin approve : token HMAC → plan=claimed + badge verifie + upgrade card', async ({ page, request }) => {
    await resetCentre('pending');
    const token = await generateAdminToken('approve', TEST_SLUG);

    const res = await request.get(`/api/admin/quick-approve?slug=${TEST_SLUG}&token=${token}`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('approuv');

    const centre = await getCentre();
    expect(centre.plan).toBe('claimed');
    expect(centre.claim_status).toBe('approved');

    await page.goto(CENTRE_URL);
    await expect(page.locator('body')).toContainText(/Fiche v[ée]rifi[ée]e/i);
    await expect(page.getByRole('region', { name: 'Passer en premium' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Revendiquer cette fiche' })).toHaveCount(0);
  });

  test('5. Premium checkout : form → Stripe session creee (redirect to checkout.stripe.com)', async ({ page }) => {
    await resetCentre('claimed');
    await page.goto(PREMIUM_FORM_URL);

    await page.fill('#claim-nom', 'Chabbat');
    await page.fill('#claim-prenom', 'Franck-Olivier');
    await page.fill('#claim-email', TEST_EMAIL);
    await page.fill('#claim-identifiant', '12345678901');
    await page.check('input[name="rgpd"]');

    const [checkoutResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/checkout') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /Passer au paiement/i }).click(),
    ]);

    expect(checkoutResponse.status()).toBe(200);

    // Le body est consomme par la redirection immediate — on valide l'URL finale Stripe
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
    expect(page.url()).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  });

  test('6. Webhook premium : checkout.session.completed signe → plan=premium + badge recommande', async ({ page, baseURL }) => {
    await resetCentre('claimed');

    const event = buildCheckoutCompletedEvent({
      centreSlug: TEST_SLUG,
      email: TEST_EMAIL,
      subscriptionId: TEST_SUBSCRIPTION_ID,
      customerId: TEST_CUSTOMER_ID,
    });
    const res = await postSignedWebhook(baseURL!, event);
    expect(res.status).toBe(200);

    const centre = await getCentre();
    expect(centre.plan).toBe('premium');
    expect(centre.is_premium).toBe(true);
    expect(centre.stripe_subscription_id).toBe(TEST_SUBSCRIPTION_ID);
    expect(centre.stripe_customer_id).toBe(TEST_CUSTOMER_ID);

    await page.goto(CENTRE_URL);
    await expect(page.locator('body')).toContainText(/Recommand[ée] LeGuideAuditif/i);
    await expect(page.getByRole('region', { name: 'Passer en premium' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Revendiquer cette fiche' })).toHaveCount(0);
  });

  test('7. Webhook subscription cancelled : → plan=claimed + is_premium=false', async ({ page, baseURL }) => {
    await resetCentre('premium');

    const event = buildSubscriptionDeletedEvent(TEST_SUBSCRIPTION_ID);
    const res = await postSignedWebhook(baseURL!, event);
    expect(res.status).toBe(200);

    const centre = await getCentre();
    expect(centre.plan).toBe('claimed');
    expect(centre.is_premium).toBe(false);

    await page.goto(CENTRE_URL);
    await expect(page.getByRole('region', { name: 'Passer en premium' })).toBeVisible();
  });

  test('8. Idempotence webhook premium : deuxieme appel ne casse pas', async ({ baseURL }) => {
    await resetCentre('premium');
    const event = buildCheckoutCompletedEvent({
      centreSlug: TEST_SLUG,
      email: TEST_EMAIL,
      subscriptionId: TEST_SUBSCRIPTION_ID,
      customerId: TEST_CUSTOMER_ID,
    });
    const res = await postSignedWebhook(baseURL!, event);
    expect(res.status).toBe(200);

    const centre = await getCentre();
    expect(centre.plan).toBe('premium');
  });

  test.afterAll(async () => {
    await resetCentre('rpps');
  });
});

// Test full Stripe Checkout — carte 4242 (requiert sk_test_* dans STRIPE_SECRET_KEY)
test.describe('@full Stripe Checkout complet', () => {
  test.slow();

  test.skip(
    !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'),
    'STRIPE_SECRET_KEY doit etre une cle de test (sk_test_...) pour ce scenario. ' +
      'Clé LIVE detectee : la carte 4242 est refusee en production. ' +
      'Cree un .env.test avec les cles Stripe test ou remplace temporairement dans .env.',
  );

  test('9. Premium E2E complet : form → Stripe UI → carte 4242 → webhook simule → plan=premium', async ({
    page,
    baseURL,
  }) => {
    await resetCentre('claimed');
    await page.goto(PREMIUM_FORM_URL);

    await page.fill('#claim-nom', 'Chabbat');
    await page.fill('#claim-prenom', 'Franck-Olivier');
    await page.fill('#claim-email', TEST_EMAIL);
    await page.fill('#claim-identifiant', '12345678901');
    await page.check('input[name="rgpd"]');

    await page.getByRole('button', { name: /Passer au paiement/i }).click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

    // Stripe Checkout peut afficher ILS par defaut (geoloc IP) — forcer EUR
    const eurButton = page.getByRole('button', { name: /^EUR$/ });
    if (await eurButton.count()) {
      await eurButton.click();
    }

    // L'email est dans Stripe Link (OTP demande) — bypass avec "Payer sans Link"
    const payWithoutLink = page.getByRole('button', { name: /Payer sans Link/i });
    if (await payWithoutLink.count()) {
      await payWithoutLink.click();
    }

    // Stripe Checkout UI — remplir la carte de test 4242
    await page.locator('#cardNumber').fill('4242424242424242', { timeout: 30_000 });
    await page.locator('#cardExpiry').fill('12 / 34');
    await page.locator('#cardCvc').fill('123');
    await page.locator('#billingName').fill('Franck-Olivier Chabbat');

    const countryField = page.locator('#billingCountry');
    if (await countryField.count()) {
      await countryField.selectOption('FR');
    }

    const postal = page.locator('#billingPostalCode');
    if (await postal.count()) {
      await postal.fill('75001');
    }

    await page.getByTestId('hosted-payment-submit-button').click();

    await page.waitForURL(/revendiquer\/confirmation/, { timeout: 60_000 });
    const sessionId = new URL(page.url()).searchParams.get('session_id');
    expect(sessionId).toMatch(/^cs_test_/);

    // Stripe ne notifie pas notre webhook en local — on simule avec le vrai session_id
    const event = buildCheckoutCompletedEvent({
      centreSlug: TEST_SLUG,
      email: TEST_EMAIL,
      subscriptionId: TEST_SUBSCRIPTION_ID,
      customerId: TEST_CUSTOMER_ID,
      sessionId: sessionId!,
    });
    const res = await postSignedWebhook(baseURL!, event);
    expect(res.status).toBe(200);

    const centre = await getCentre();
    expect(centre.plan).toBe('premium');
  });

  test.afterAll(async () => {
    await resetCentre('rpps');
  });
});
