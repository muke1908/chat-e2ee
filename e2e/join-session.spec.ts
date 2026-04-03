import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * E2E tests for the two-user join flow.
 *
 * Regression coverage for: "Key already registered for this session"
 *   - User A creates a hash and joins.
 *   - User B joins via that hash.
 *   - The server previously returned 409 on User B's second sharePublicKey call
 *     (the one that attaches the encrypted AES key), causing setChannel() to
 *     throw and the UI to show "Failed to connect."
 */

const APP_URL = 'http://localhost:5173';

async function openUser(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(APP_URL);
  // Wait for app to initialise keys
  await expect(page.locator('#show-create-hash')).toBeVisible();
  return { ctx, page };
}

test.describe('Two-user session join', () => {
  test('user B joins after user A without a "Key already registered" error', async ({ browser }) => {
    const userA = await openUser(browser);
    const userB = await openUser(browser);

    // ── User A: create a channel hash ────────────────────────────────────────
    await test.step('User A creates a hash', async () => {
      await userA.page.click('#show-create-hash');
      // Wait until the hash field is populated (not still "Generating...")
      await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('');
      await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    });

    const hash = await userA.page.locator('#generated-hash-display').inputValue();
    expect(hash.length).toBeGreaterThan(5);

    // ── User A: join the channel ──────────────────────────────────────────────
    await test.step('User A joins the channel', async () => {
      await userA.page.click('#join-btn');
      await expect(userA.page.locator('#chat-container')).toBeVisible();
      // Must not show an error
      await expect(userA.page.locator('#setup-status')).not.toHaveText('Failed to connect.');
    });

    // ── User B: enter hash and join ───────────────────────────────────────────
    await test.step('User B joins using the hash', async () => {
      await userB.page.click('#show-join-hash');
      await userB.page.fill('#channel-hash', hash);
      await userB.page.click('#join-btn');

      // Chat container should appear — not the error status
      await expect(userB.page.locator('#chat-container')).toBeVisible();
      await expect(userB.page.locator('#setup-status')).not.toHaveText('Failed to connect.');
    });

    // ── Both users should see each other ─────────────────────────────────────
    await test.step('User A sees peer joined notification', async () => {
      await expect(userA.page.locator('#participant-info')).toHaveText(
        'Peer joined. Communication is encrypted.',
      );
    });

    await test.step('User B sees peer already present notification', async () => {
      await expect(userB.page.locator('#participant-info')).toHaveText(
        'Peer is already here. Communication is encrypted.',
      );
    });

    await userA.ctx.close();
    await userB.ctx.close();
  });

  test('user B can join after going back and retrying (userId reset)', async ({ browser }) => {
    const userA = await openUser(browser);
    const userB = await openUser(browser);

    // User A creates and joins
    await userA.page.click('#show-create-hash');
    await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    const hash = await userA.page.locator('#generated-hash-display').inputValue();
    await userA.page.click('#join-btn');
    await expect(userA.page.locator('#chat-container')).toBeVisible();

    // User B: first attempt (enters hash, clicks join)
    await userB.page.click('#show-join-hash');
    await userB.page.fill('#channel-hash', hash);
    await userB.page.click('#join-btn');
    await expect(userB.page.locator('#chat-container')).toBeVisible();

    await userA.ctx.close();
    await userB.ctx.close();

    // ── Regression: simulate a fresh user B with a new page (fresh userId) ────
    // After page reload userId is cleared; the same hash should be joinable again
    // (requires the back-button userId reset fix in client/app.ts).
    const userB2 = await openUser(browser);
    const userA2 = await openUser(browser);

    await userA2.page.click('#show-create-hash');
    await expect(userA2.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    const hash2 = await userA2.page.locator('#generated-hash-display').inputValue();
    await userA2.page.click('#join-btn');
    await expect(userA2.page.locator('#chat-container')).toBeVisible();

    // User B2 tries join → back → retries (simulates back-button userId reset)
    await userB2.page.click('#show-join-hash');
    await userB2.page.fill('#channel-hash', hash2);
    // Go back before joining
    await userB2.page.click('#back-btn');
    await expect(userB2.page.locator('#initial-actions')).toBeVisible();
    // Try again from scratch
    await userB2.page.click('#show-join-hash');
    await userB2.page.fill('#channel-hash', hash2);
    await userB2.page.click('#join-btn');
    await expect(userB2.page.locator('#chat-container')).toBeVisible();
    await expect(userB2.page.locator('#setup-status')).not.toHaveText('Failed to connect.');

    await userA2.ctx.close();
    await userB2.ctx.close();
  });

  test('user A and user B can exchange a message after joining', async ({ browser }) => {
    const userA = await openUser(browser);
    const userB = await openUser(browser);

    // Setup
    await userA.page.click('#show-create-hash');
    await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    const hash = await userA.page.locator('#generated-hash-display').inputValue();
    await userA.page.click('#join-btn');
    await expect(userA.page.locator('#chat-container')).toBeVisible();

    await userB.page.click('#show-join-hash');
    await userB.page.fill('#channel-hash', hash);
    await userB.page.click('#join-btn');
    await expect(userB.page.locator('#chat-container')).toBeVisible();

    // Wait for both to see each other
    await expect(userA.page.locator('#participant-info')).toHaveText(
      'Peer joined. Communication is encrypted.',
    );

    // User A sends a message
    await test.step('User A sends a message', async () => {
      await userA.page.fill('#msg-input', 'Hello from A');
      await userA.page.click('#send-btn');
      // Sender sees it immediately in their own list
      await expect(userA.page.locator('.message.sent .message-text')).toHaveText('Hello from A');
    });

    // User B receives it (decrypted)
    await test.step('User B receives and decrypts the message', async () => {
      await expect(userB.page.locator('.message.received .message-text')).toHaveText('Hello from A');
    });

    await userA.ctx.close();
    await userB.ctx.close();
  });
});
