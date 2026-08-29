import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * E2E tests for the two-user invite-link join flow.
 *
 * Regression coverage for the invite-secret redesign:
 *   - User A creates a room and receives an invitation link containing
 *     `#room=<public-room-id>&secret=<client-generated-secret>`.
 *   - User B joins by pasting that invitation link (or just its fragment).
 *   - Both derive the same signaling/chat keys locally via HKDF — the
 *     secret is never sent to, or seen by, the server.
 */

const APP_URL = 'http://localhost:5173';

async function openUser(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(APP_URL);
  // Wait for app to initialise
  await expect(page.locator('#show-create-hash')).toBeVisible();
  return { ctx, page };
}

test.describe('Two-user invite-link join', () => {
  test('user B joins via the invitation link and both are connected', async ({ browser }) => {
    const userA = await openUser(browser);
    const userB = await openUser(browser);

    // ── User A: create an invitation ─────────────────────────────────────────
    await test.step('User A creates an invitation link', async () => {
      await userA.page.click('#show-create-hash');
      // Wait until the invite link field is populated (not still "Generating...")
      await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('');
      await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    });

    const inviteLink = await userA.page.locator('#generated-hash-display').inputValue();
    expect(inviteLink).toContain('#room=');
    expect(inviteLink).toContain('secret=');

    // ── User A: joins their own channel ───────────────────────────────────────
    await test.step('User A joins the channel', async () => {
      await userA.page.click('#join-btn');
      await expect(userA.page.locator('#chat-container')).toBeVisible();
      // Must not show an error
      await expect(userA.page.locator('#setup-status')).not.toHaveText('Failed to connect.');
    });

    // ── User B: paste the invitation link and join ────────────────────────────
    await test.step('User B joins using the invitation link', async () => {
      await userB.page.click('#show-join-hash');
      await userB.page.fill('#channel-hash', inviteLink);
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

    await test.step('User B sees the channel as encrypted', async () => {
      await expect(userB.page.locator('#participant-info')).toHaveText(
        'Peer joined. Communication is encrypted.',
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
    const inviteLink = await userA.page.locator('#generated-hash-display').inputValue();
    await userA.page.click('#join-btn');
    await expect(userA.page.locator('#chat-container')).toBeVisible();

    // User B: first attempt (pastes invite, clicks join)
    await userB.page.click('#show-join-hash');
    await userB.page.fill('#channel-hash', inviteLink);
    await userB.page.click('#join-btn');
    await expect(userB.page.locator('#chat-container')).toBeVisible();

    await userA.ctx.close();
    await userB.ctx.close();

    // ── Regression: simulate a fresh user B with a new page (fresh userId) ────
    // After page reload userId is cleared; the same invitation should be
    // joinable again once the previous session has disconnected.
    const userB2 = await openUser(browser);
    const userA2 = await openUser(browser);

    await userA2.page.click('#show-create-hash');
    await expect(userA2.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    const inviteLink2 = await userA2.page.locator('#generated-hash-display').inputValue();
    await userA2.page.click('#join-btn');
    await expect(userA2.page.locator('#chat-container')).toBeVisible();

    // User B2 tries join → back → retries (simulates back-button userId reset)
    await userB2.page.click('#show-join-hash');
    await userB2.page.fill('#channel-hash', inviteLink2);
    // Go back before joining
    await userB2.page.click('#back-btn');
    await expect(userB2.page.locator('#initial-actions')).toBeVisible();
    // Try again from scratch
    await userB2.page.click('#show-join-hash');
    await userB2.page.fill('#channel-hash', inviteLink2);
    await userB2.page.click('#join-btn');
    await expect(userB2.page.locator('#chat-container')).toBeVisible();
    await expect(userB2.page.locator('#setup-status')).not.toHaveText('Failed to connect.');

    await userA2.ctx.close();
    await userB2.ctx.close();
  });

  test('user A and user B can exchange a message end-to-end after joining', async ({ browser }) => {
    const userA = await openUser(browser);
    const userB = await openUser(browser);

    // Setup
    await userA.page.click('#show-create-hash');
    await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    const inviteLink = await userA.page.locator('#generated-hash-display').inputValue();
    await userA.page.click('#join-btn');
    await expect(userA.page.locator('#chat-container')).toBeVisible();

    await userB.page.click('#show-join-hash');
    await userB.page.fill('#channel-hash', inviteLink);
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

    // User B receives it (decrypted by the SDK before it ever reaches the UI)
    await test.step('User B receives and displays the decrypted message', async () => {
      await expect(userB.page.locator('.message.received .message-text')).toHaveText('Hello from A');
    });

    await userA.ctx.close();
    await userB.ctx.close();
  });

  test('joining without a secret (bare room id) fails to connect', async ({ browser }) => {
    const userA = await openUser(browser);
    const userB = await openUser(browser);

    await userA.page.click('#show-create-hash');
    await expect(userA.page.locator('#generated-hash-display')).not.toHaveValue('Generating...');
    const inviteLink = await userA.page.locator('#generated-hash-display').inputValue();
    await userA.page.click('#join-btn');
    await expect(userA.page.locator('#chat-container')).toBeVisible();

    const roomIdMatch = inviteLink.match(/room=([^&]+)/);
    const roomId = roomIdMatch ? roomIdMatch[1] : '';
    expect(roomId).not.toBe('');

    // Attempting to join with only the room id (no secret) must not succeed:
    // the Join view requires a valid invitation link/fragment to be parsed.
    await userB.page.click('#show-join-hash');
    await userB.page.fill('#channel-hash', roomId);
    await expect(userB.page.locator('#join-btn')).toBeEnabled();
    await userB.page.click('#join-btn');

    await expect(userB.page.locator('#setup-status')).toHaveText(
      'Please enter a valid invitation link.',
    );
    await expect(userB.page.locator('#chat-container')).not.toBeVisible();

    await userA.ctx.close();
    await userB.ctx.close();
  });
});
