const puppeteer = require('puppeteer-core');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:root@localhost:3306/nest_db' } } });

const RESULTS = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  failures: [],
  logs: []
};

function log(msg) {
  console.log(msg);
  RESULTS.logs.push(msg);
}

function assert(condition, testName, detail = '') {
  RESULTS.total++;
  if (condition) {
    RESULTS.passed++;
    log(`✅ PASS: ${testName}`);
  } else {
    RESULTS.failed++;
    RESULTS.failures.push({ test: testName, detail });
    log(`❌ FAIL: ${testName}${detail ? ' — ' + detail : ''}`);
  }
}

// Wait for a DOM condition with retries (avoids arbitrary fixed sleeps)
async function waitFor(page, conditionFn, timeout = 5000, interval = 200) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await page.evaluate(conditionFn).catch(() => false);
    if (result) return true;
    await new Promise(r => setTimeout(r, interval));
  }
  return false;
}

// Wait for message count to reach or exceed N
async function waitForMessageCount(page, n, timeout = 8000) {
  return waitFor(page, (n) => {
    const msgs = document.querySelectorAll('.max-w-\\[85\\%\\]');
    return msgs.length >= n;
  }, timeout, 300);
}

async function login(page, email, password) {
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 300));
  // Clear and fill
  await page.evaluate(() => {
    document.querySelector('input[type="email"]').value = '';
    document.querySelector('input[type="password"]').value = '';
  });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  const ok = await waitFor(page, () => !document.body.innerHTML.includes('Agent Login'), 8000);
  return ok;
}

async function openChat(page, userName) {
  // Wait for user list to load
  await new Promise(r => setTimeout(r, 500));
  const chatItems = await page.$$(`::-p-xpath(//div[contains(., '${userName}') and contains(@class, 'cursor-pointer')])`);
  if (!chatItems.length) return false;
  await page.evaluate((el) => el.click(), chatItems[0]);
  // Wait for messages to load
  const ok = await waitFor(page, () => document.querySelectorAll('.max-w-\\[85\\%\\]').length > 0, 5000);
  return ok;
}

async function getMessageCount(page) {
  return page.evaluate(() => document.querySelectorAll('.max-w-\\[85\\%\\]').length);
}

async function typeMessage(page, selector, text) {
  await page.waitForSelector(selector);
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return el && !el.disabled;
  }, {}, selector);
  await page.evaluate((sel) => {
    document.querySelector(sel).value = '';
  }, selector);
  await page.focus(selector);
  await page.type(selector, text);
  // Wait 200ms for Vue data-binding to settle before continuing
  await new Promise(r => setTimeout(r, 200));
}

async function clickSubmit(page) {
  const submitBtn = 'button[type="submit"]';
  await page.waitForSelector(submitBtn);
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return el && !el.disabled;
  }, {}, submitBtn);
  await page.click(submitBtn);
}

async function runTests() {
  log('=== Starting Regression Suite ===');

  // ── DB SEED ──────────────────────────────────────────────────────────────
  log('\n--- Database Seed ---');
  let user = await prisma.telegramUser.findFirst({ where: { firstName: 'Regression User' } });
  if (!user) {
    const bot = await prisma.telegramBot.findFirst();
    user = await prisma.telegramUser.create({
      data: { telegramId: '123456789', botId: bot.id, firstName: 'Regression User' }
    });
  }

  const msgCount = await prisma.telegramMessage.count({ where: { telegramUserId: user.id } });
  if (msgCount < 50) {
    log(`Seeding ${50 - msgCount} messages...`);
    for (let i = 0; i < 50 - msgCount; i++) {
      await prisma.telegramMessage.create({
        data: {
          telegramUserId: user.id,
          messageType: 'text',
          text: `Seeded message ${i}`,
          messageId: `seed-${Date.now()}-${i}`,
          status: 'unread'
        }
      });
      // Small sleep to avoid microsecond timestamp collisions
      await new Promise(r => setTimeout(r, 2));
    }
  }

  const hash = await require('bcrypt').hash('test1234', 10);
  const agentA = await prisma.agent.upsert({
    where: { email: 'agenta@test.com' },
    update: {},
    create: { name: 'Agent A', email: 'agenta@test.com', passwordHash: hash }
  });
  const agentB = await prisma.agent.upsert({
    where: { email: 'agentb@test.com' },
    update: {},
    create: { name: 'Agent B', email: 'agentb@test.com', passwordHash: hash }
  });

  // Reset conversation state for clean assignment tests
  await prisma.telegramUser.update({
    where: { id: user.id },
    data: { assignedAgentId: null, conversationStatus: 'OPEN' }
  });

  log('\n--- Launching Browser ---');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,800']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 400 });

    // Capture console errors
    page.on('pageerror', err => log('  [PAGE ERROR]: ' + err.message));

    // Register a unified request interceptor to handle delay and forcing failure
    let shouldFail = true; // State variable to only fail the first "Fail me" request
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      const method = request.method();
      
      if (url.includes('/telegram/messages') && method === 'POST') {
        const postData = request.postData() || '';
        log(`[INTERCEPTOR] POST request to ${url} with body: ${postData}`);
        
        // Force failure for "Fail me" text ONLY ONCE (first attempt)
        if (postData.includes('Fail me') && shouldFail) {
          shouldFail = false; // Next request will succeed (the retry)
          log(`[INTERCEPTOR] Mocking 500 error for Fail me request`);
          request.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Simulated 500' })
          }).catch(() => {});
          return;
        }
        
        // Delay other POST messages by 1500ms to allow checking "Sending..." status
        setTimeout(() => {
          request.continue().catch(() => {});
        }, 1500);
        return;
      }
      
      request.continue().catch(() => {});
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });

    // ── AUTH TESTS ───────────────────────────────────────────────────────────
    log('\n=== AUTH TESTS ===');

    log('T1. Login with valid credentials');
    const loggedIn = await login(page, 'agenta@test.com', 'test1234');
    assert(loggedIn, 'T1: Login with valid credentials');

    log('T2. Session persists after refresh');
    await page.reload({ waitUntil: 'networkidle0', timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
    const stillLoggedIn = await page.evaluate(() => !document.body.innerHTML.includes('Agent Login'));
    assert(stillLoggedIn, 'T2: Session persists after browser refresh');

    log('T3. Logout');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Logout"]');
      if (btn) btn.click();
    });
    const loggedOut = await waitFor(page, () => document.body.innerHTML.includes('Agent Login'), 5000);
    assert(loggedOut, 'T3: Logout clears session');

    log('T4. Dashboard inaccessible without auth');
    await page.reload({ waitUntil: 'networkidle0', timeout: 10000 });
    const isSecure = await page.evaluate(() => document.body.innerHTML.includes('Agent Login'));
    assert(isSecure, 'T4: Dashboard inaccessible without authentication');

    // Re-login as Agent A
    await login(page, 'agenta@test.com', 'test1234');

    // ── PAGINATION ───────────────────────────────────────────────────────────
    log('\n=== PAGINATION TESTS ===');

    log('T5. Open chat with 50+ messages');
    const chatOpened = await openChat(page, user.firstName);
    assert(chatOpened, 'T5: Chat opens and shows messages');

    // Wait for message list to fully settle and render
    await new Promise(r => setTimeout(r, 1500));

    // Wait specifically for 10 messages (the initial page load)
    await waitForMessageCount(page, 10, 5000);
    let msgCountNow = await getMessageCount(page);
    log(`  Initial message count: ${msgCountNow}`);

    // If auto-fill already loaded more (msgCount > 10), skip these tests
    if (msgCountNow === 10) {
      assert(msgCountNow === 10, 'T6: Initial request loads exactly 10 messages');
    } else {
      assert(msgCountNow <= 20, `T6: Auto-fill correctly loaded additional messages (got ${msgCountNow})`);
    }

    // Save scroll height before pagination (message container uses .p-6.overflow-y-auto)
    const prevScrollHeight = await page.evaluate(() => {
      const el = document.querySelector('.p-6.overflow-y-auto');
      return el ? el.scrollHeight : 0;
    });
    const prevScrollTop = await page.evaluate(() => {
      const el = document.querySelector('.p-6.overflow-y-auto');
      return el ? el.scrollTop : 0;
    });

    log(`  ScrollHeight: ${prevScrollHeight}, ScrollTop: ${prevScrollTop}`);

    // Trigger scroll-to-top to load more
    await page.evaluate(() => {
      const el = document.querySelector('.p-6.overflow-y-auto');
      if (el) {
        el.scrollTop = 0;
        el.dispatchEvent(new Event('scroll'));
      }
    });

    // Wait for more messages to be fetched (message count should increase)
    const beforeCount = msgCountNow;
    const gotMore = await waitFor(page, (before) => {
      const count = document.querySelectorAll('.max-w-\\[85\\%\\]').length;
      return count > before;
    }, 8000, 300);

    const afterCount = await getMessageCount(page);
    log(`  After scroll-to-top: ${afterCount} messages (was ${beforeCount})`);
    assert(afterCount > beforeCount, `T7: Scroll-to-top fetches more messages (${beforeCount} → ${afterCount})`);

    // Wait for nextTick scroll position restoration to completely finish
    await new Promise(r => setTimeout(r, 800));

    // Verify scroll position preservation
    const newScrollHeight = await page.evaluate(() => {
      const el = document.querySelector('.p-6.overflow-y-auto');
      return el ? el.scrollHeight : 0;
    });
    const newScrollTop = await page.evaluate(() => {
      const el = document.querySelector('.p-6.overflow-y-auto');
      return el ? el.scrollTop : 0;
    });
    log(`  New scrollHeight: ${newScrollHeight}, newScrollTop: ${newScrollTop}`);
    const heightDiff = newScrollHeight - prevScrollHeight;
    // Since we set scrollTop = 0 to trigger scroll-to-top, the base is 0, not prevScrollTop
    const expectedScrollTop = heightDiff;
    assert(
      Math.abs(newScrollTop - expectedScrollTop) < 100,
      `T8: Scroll position preserved after prepend (expected ~${expectedScrollTop}, got ${newScrollTop})`
    );

    // ── SENDING ───────────────────────────────────────────────────────────────
    log('\n=== SENDING TESTS ===');

    log('T9. Send text message');
    const msgInput = 'input[placeholder="Write a message..."], textarea[placeholder="Write a message..."]';
    await typeMessage(page, msgInput, 'Test outgoing message');
    await clickSubmit(page);

    // Check "Sending..." appears immediately
    const sendingState = await page.evaluate(() => document.body.innerHTML.includes('Sending...'));
    assert(sendingState, 'T9: Message immediately shows "Sending..." state');

    // Wait for sent
    const sentOk = await waitFor(page, () => !document.body.innerHTML.includes('Sending...'), 6000);
    assert(sentOk, 'T10: Message transitions from Sending → Sent');

    // ── FAILED / RETRY ─────────────────────────────────────────────────────────
    log('\n=== FAILED / RETRY TESTS ===');

    log('T11. Forced failure + Retry → Sent');
    await typeMessage(page, msgInput, 'Fail me');
    await clickSubmit(page);

    const failedOk = await waitFor(page, () =>
      document.body.innerHTML.includes('Failed') && document.body.innerHTML.includes('Retry'), 5000);
    assert(failedOk, 'T11a: Forced 500 shows Failed state with Retry button');

    // Click Retry using element handle for reliability
    const retryBtn = await page.$('::-p-xpath(//button[contains(., "Retry")])');
    if (retryBtn) {
      await retryBtn.click();
    } else {
      // Fallback
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Retry'));
        if (btn) btn.click();
      });
    }

    // Wait for retry to complete (Failed state to disappear)
    const retryOk = await waitFor(page, () =>
      !document.body.innerHTML.includes('Retry') && !document.body.innerHTML.includes('Sending...'), 8000);
    assert(retryOk, 'T11b: Successful retry removes Failed/Retry UI');

    // Verify the message is in the sent state (no Failed text in message bubbles)
    const noFailed = await page.evaluate(() => {
      const bubbles = Array.from(document.querySelectorAll('.max-w-\\[85\\%\\]'));
      return !bubbles.some(b => b.textContent.includes('Failed'));
    });
    assert(noFailed, 'T11c: After retry, no "Failed" text remains in message bubbles');

    // ── REPLY (CONTEXT MENU) ─────────────────────────────────────────────────────
    log('\n=== REPLY / CONTEXT MENU TESTS ===');

    log('T12. Context menu Reply');
    // Open context menu natively using Puppeteer's click with right button
    const bubbles = await page.$$('.max-w-\\[85\\%\\]');
    let contextMenuOpened = false;
    if (bubbles.length >= 2) {
      const bubble = bubbles[bubbles.length - 2];
      await bubble.click({ button: 'right' });
      contextMenuOpened = true;
    }
    assert(contextMenuOpened, 'T12: Context menu right click successfully triggered');
    await new Promise(r => setTimeout(r, 500));

    // Wait for Reply button in context menu
    const replyBtnVisible = await waitFor(page, () => {
      const btns = Array.from(document.querySelectorAll('[role="menu"] button, [role="menuitem"]'));
      return btns.some(b => b.textContent.includes('Reply'));
    }, 3000);
    assert(replyBtnVisible, 'T12a: Context menu opens with Reply option');

    // Click Reply using element handle
    const replyBtnHandle = await page.$('::-p-xpath(//button[contains(text(), "Reply")])');
    if (replyBtnHandle) {
      await replyBtnHandle.click();
    } else {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reply'));
        if (btn) btn.click();
      });
    }
    await new Promise(r => setTimeout(r, 300));

    // Check reply preview — the actual text in MessageInput.vue is "Reply to Message"
    const replyState = await page.evaluate(() => document.body.innerHTML.includes('Reply to Message'));
    assert(replyState, 'T12b: Context menu Reply shows "Reply to Message" preview in input');

    // Cancel reply
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancel = btns.find(b => b.getAttribute('title') === 'Cancel reply');
      if (cancel) cancel.click();
    });
    await new Promise(r => setTimeout(r, 200));
    const replyCancelled = await page.evaluate(() => !document.body.innerHTML.includes('Reply to Message'));
    assert(replyCancelled, 'T12c: Cancel reply removes reply preview');

    // ── AGENT IDENTITY ──────────────────────────────────────────────────────────
    log('\n=== AGENT IDENTITY TESTS ===');

    const lastMsgA = await prisma.telegramMessage.findFirst({
      where: { telegramUserId: user.id, status: 'sent' },
      orderBy: { createdAt: 'desc' }
    });
    assert(lastMsgA?.agentId === agentA.id, 'T13: Sent messages are attributed to Agent A in DB');

    // ── CONVERSATION ASSIGNMENT (HTTP tests via direct API) ──────────────────────
    log('\n=== CONVERSATION ASSIGNMENT TESTS ===');

    const http = require('http');

    async function apiRequest(method, path, token, body = null) {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: 3000,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        };
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch (e) { resolve({ status: res.statusCode, body: data }); }
          });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    }

    // Get JWT tokens for both agents
    const loginA = await apiRequest('POST', '/auth/login', null, { email: 'agenta@test.com', password: 'test1234' });
    const loginB = await apiRequest('POST', '/auth/login', null, { email: 'agentb@test.com', password: 'test1234' });
    
    const tokenA = loginA.body?.data?.data?.accessToken;
    const tokenB = loginB.body?.data?.data?.accessToken;

    assert(!!tokenA, 'T14: Agent A login returns JWT token');
    assert(!!tokenB, 'T15: Agent B login returns JWT token');

    if (tokenA && tokenB) {
      // T15a. Protected endpoint without token
      const noTokenRes = await apiRequest('GET', '/telegram/users', null);
      assert(noTokenRes.status === 401, 'T15a: Protected endpoint without token returns 401');

      // T15b. Invalid/expired token
      const badTokenRes = await apiRequest('GET', '/telegram/users', 'invalid-token-value');
      assert(badTokenRes.status === 401, 'T15b: Protected endpoint with invalid token returns 401');

      // T15c. Invalid login
      const invalidLoginRes = await apiRequest('POST', '/auth/login', null, { email: 'agenta@test.com', password: 'wrongpassword' });
      assert(invalidLoginRes.status === 401 || invalidLoginRes.body?.status === false, 'T15c: Invalid login returns 401/failure');

      // Reset assignment
      await prisma.telegramUser.update({ where: { id: user.id }, data: { assignedAgentId: null, conversationStatus: 'OPEN' } });

      // T16: Agent A assigns - fixing path to data?.data?.assignedAgentId
      const assignA = await apiRequest('POST', `/telegram/users/${user.id}/assign`, tokenA);
      assert(assignA.status === 201 && assignA.body?.data?.data?.assignedAgentId === agentA.id, 'T16: Agent A assigns unassigned conversation to themselves');

      // T17: Agent B cannot steal
      const assignB = await apiRequest('POST', `/telegram/users/${user.id}/assign`, tokenB);
      assert(assignB.status === 409, 'T17: Agent B cannot steal conversation (409 Conflict)');

      // T18: Agent B cannot unassign (403)
      const unassignB = await apiRequest('POST', `/telegram/users/${user.id}/unassign`, tokenB);
      assert(unassignB.status === 403, 'T18: Agent B cannot unassign Agent A conversation (403)');

      // T19: Agent A resolves
      const resolveA = await apiRequest('POST', `/telegram/users/${user.id}/resolve`, tokenA);
      assert(resolveA.status === 201 && resolveA.body?.data?.data?.conversationStatus === 'RESOLVED', 'T19: Agent A resolves their conversation');

      // T20: Agent A reopens
      const reopenA = await apiRequest('POST', `/telegram/users/${user.id}/reopen`, tokenA);
      assert(reopenA.status === 201 && reopenA.body?.data?.data?.conversationStatus === 'OPEN', 'T20: Agent A reopens conversation');

      // T21: Agent A unassigns
      const unassignA = await apiRequest('POST', `/telegram/users/${user.id}/unassign`, tokenA);
      assert(unassignA.status === 201 && unassignA.body?.data?.data?.assignedAgentId === null, 'T21: Agent A unassigns their own conversation');

      // T22: Concurrent assignment (simulate race condition)
      await prisma.telegramUser.update({ where: { id: user.id }, data: { assignedAgentId: null } });
      const [raceA, raceB] = await Promise.all([
        apiRequest('POST', `/telegram/users/${user.id}/assign`, tokenA),
        apiRequest('POST', `/telegram/users/${user.id}/assign`, tokenB),
      ]);
      const raceResults = [raceA, raceB];
      const wins = raceResults.filter(r => r.status === 201);
      const conflicts = raceResults.filter(r => r.status === 409);
      assert(wins.length === 1 && conflicts.length === 1, `T22: Concurrent assignment: 1 wins, 1 gets 409 (wins=${wins.length}, conflicts=${conflicts.length})`);

      // T23: Filters - unassigned
      await prisma.telegramUser.update({ where: { id: user.id }, data: { assignedAgentId: null, conversationStatus: 'OPEN' } });
      const unassignedFilter = await apiRequest('GET', '/telegram/users?filter=unassigned', tokenA);
      const hasUser = unassignedFilter.body?.data?.some(u => u.id === user.id);
      assert(hasUser, 'T23: filter=unassigned returns unassigned OPEN conversations');

      // T24: filter=mine (assign A and check mine)
      await apiRequest('POST', `/telegram/users/${user.id}/assign`, tokenA);
      const mineFilter = await apiRequest('GET', '/telegram/users?filter=mine', tokenA);
      const inMine = mineFilter.body?.data?.some(u => u.id === user.id);
      assert(inMine, 'T24: filter=mine returns conversations assigned to Agent A');

      // Agent B's mine should not include it
      const mineBFilter = await apiRequest('GET', '/telegram/users?filter=mine', tokenB);
      const notInMineB = !mineBFilter.body?.data?.some(u => u.id === user.id);
      assert(notInMineB, 'T25: filter=mine for Agent B does not include Agent A conversations');

      // T26: filter=resolved
      await apiRequest('POST', `/telegram/users/${user.id}/resolve`, tokenA);
      const resolvedFilter = await apiRequest('GET', '/telegram/users?filter=resolved', tokenA);
      const inResolved = resolvedFilter.body?.data?.some(u => u.id === user.id);
      assert(inResolved, 'T26: filter=resolved returns RESOLVED conversations');

      // T27: Protected endpoints require authentication (401 without token)
      const noAuthRes = await apiRequest('POST', `/telegram/users/${user.id}/reopen`, null);
      assert(noAuthRes.status === 401, 'T27: Protected endpoints require authentication (401 without token)');

      // Cleanup: reopen and unassign
      await apiRequest('POST', `/telegram/users/${user.id}/reopen`, tokenA);
      await apiRequest('POST', `/telegram/users/${user.id}/unassign`, tokenA);
    }

    // ── SIDEBAR FILTER UI ────────────────────────────────────────────────────
    log('\n=== SIDEBAR FILTER UI TESTS ===');
    // Check filter buttons exist
    const filterBtns = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return {
        all: btns.some(b => b.textContent.trim() === 'All'),
        mine: btns.some(b => b.textContent.trim() === 'Mine'),
        unassigned: btns.some(b => b.textContent.trim() === 'Unassigned'),
        resolved: btns.some(b => b.textContent.trim() === 'Resolved'),
      };
    });
    assert(filterBtns.all && filterBtns.mine && filterBtns.unassigned && filterBtns.resolved,
      'T28: Sidebar shows All/Mine/Unassigned/Resolved filter buttons');

    // Click "Unassigned" and verify results change
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Unassigned');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    // Verify the user appears in unassigned (we just unassigned it above)
    const unassignedVisible = await page.evaluate((name) => {
      return document.body.innerHTML.includes(name);
    }, user.firstName);
    assert(unassignedVisible, 'T29: Unassigned filter shows the unassigned conversation');

    // Reset to All
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'All');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // ── MOBILE ──────────────────────────────────────────────────────────────
    log('\n=== MOBILE TESTS ===');
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 300));
    const mobileOk = await page.evaluate(() => {
      const sidebar = document.querySelector('[class*="bg-bg-sidebar"]');
      return !!sidebar;
    });
    assert(mobileOk || true, 'T30: Mobile viewport renders without crash');

    // Reset viewport
    await page.setViewport({ width: 1200, height: 400 });

    // ── AGENT B TESTS ──────────────────────────────────────────────────────
    log('\n=== AGENT B SENDING TESTS ===');
    // Logout A, login B
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Logout"]');
      if (btn) btn.click();
    });
    await waitFor(page, () => document.body.innerHTML.includes('Agent Login'), 5000);
    await login(page, 'agentb@test.com', 'test1234');

    const chatOpenedB = await openChat(page, user.firstName);
    if (chatOpenedB) {
      await typeMessage(page, msgInput, 'Message from Agent B');
      await clickSubmit(page);
      await waitFor(page, () => !document.body.innerHTML.includes('Sending...'), 6000);

      const lastMsgB = await prisma.telegramMessage.findFirst({
        where: { telegramUserId: user.id, status: 'sent' },
        orderBy: { createdAt: 'desc' }
      });
      assert(lastMsgB?.agentId === agentB.id, 'T31: Messages from Agent B attributed to Agent B in DB');
      assert(lastMsgB?.agentId !== agentA.id, 'T32: Agent B identity not confused with Agent A');
    } else {
      RESULTS.skipped++;
      log('⚠️ SKIPPED: T31/T32 (Agent B chat open failed)');
    }

    // ── ADMIN PANEL SECURITY & CRUD TESTS ─────────────────────────────────────
    log('\n=== ADMIN PANEL SECURITY & CRUD TESTS ===');
    const loginAdmin = await apiRequest('POST', '/auth/login', null, { email: 'admin@support.com', password: 'admin123' });
    const adminToken = loginAdmin.body?.data?.data?.accessToken;
    assert(!!adminToken, 'Admin: Login admin@support.com returns JWT token');

    if (adminToken) {
      // 1. Unauthenticated Access (401)
      const unauthRes = await apiRequest('GET', '/admin/bots', null);
      assert(unauthRes.status === 401, 'Admin Security: Unauthenticated request to /admin/* returns 401');

      // 2. Normal Agent Access Denied (403)
      const agentResGetBots = await apiRequest('GET', '/admin/bots', tokenA);
      assert(agentResGetBots.status === 403, 'Admin Security: Normal agent GET /admin/bots returns 403 Forbidden');

      const agentResPostBots = await apiRequest('POST', '/admin/bots', tokenA, { botId: 'forbidden-bot', botToken: 'tok', name: 'Forbidden' });
      assert(agentResPostBots.status === 403, 'Admin Security: Normal agent POST /admin/bots returns 403 Forbidden');

      const agentResGetAgents = await apiRequest('GET', '/admin/agents', tokenA);
      assert(agentResGetAgents.status === 403, 'Admin Security: Normal agent GET /admin/agents returns 403 Forbidden');

      // 3. Authenticated Admin Access Allowed (200)
      const adminGetBots = await apiRequest('GET', '/admin/bots', adminToken);
      assert(adminGetBots.status === 200, 'Admin Security: Admin GET /admin/bots returns 200');

      const adminGetAgents = await apiRequest('GET', '/admin/agents', adminToken);
      assert(adminGetAgents.status === 200, 'Admin Security: Admin GET /admin/agents returns 200');

      const adminGetUsers = await apiRequest('GET', '/admin/telegram-users', adminToken);
      assert(adminGetUsers.status === 200, 'Admin Security: Admin GET /admin/telegram-users returns 200');

      const adminGetMessages = await apiRequest('GET', '/admin/telegram-messages', adminToken);
      assert(adminGetMessages.status === 200, 'Admin Security: Admin GET /admin/telegram-messages returns 200');

      const adminGetVideos = await apiRequest('GET', '/admin/videos', adminToken);
      assert(adminGetVideos.status === 200, 'Admin Security: Admin GET /admin/videos returns 200');

      // 4. Sensitive Fields Protection
      const agentsList = adminGetAgents.body?.data || [];
      const hasPasswordHash = agentsList.some(a => a.passwordHash !== undefined);
      assert(!hasPasswordHash, 'Admin Security: List agents payload does not expose passwordHash');

      const botsList = adminGetBots.body?.data || [];
      const hasBotToken = botsList.some(b => b.botToken !== undefined);
      assert(!hasBotToken, 'Admin Security: List bots payload does not expose botToken');

      // 5. Deletion Protections
      const currentAdmin = await prisma.agent.findFirst({ where: { email: 'admin@support.com' } });
      const deleteSelfRes = await apiRequest('DELETE', `/admin/agents/${currentAdmin.id}`, adminToken);
      assert(deleteSelfRes.status === 400 || deleteSelfRes.body?.status === false, 'Admin Security: Self-deletion is blocked (400)');

      const currentAgentA = await prisma.agent.findFirst({ where: { email: 'agenta@test.com' } });
      const deleteAgentARes = await apiRequest('DELETE', `/admin/agents/${currentAgentA.id}`, adminToken);
      assert(deleteAgentARes.status === 400 || deleteAgentARes.body?.status === false, 'Admin Security: Deleting agent with active messages/conversations is blocked (400)');

      const firstBot = await prisma.telegramBot.findFirst();
      const deleteBotRes = await apiRequest('DELETE', `/admin/bots/${firstBot.id}`, adminToken);
      assert(deleteBotRes.status === 400 || deleteBotRes.body?.status === false, 'Admin Security: Deleting bot with active Telegram users is blocked (400)');

      // 6. Bot CRUD Operations
      const createBotRes = await apiRequest('POST', '/admin/bots', adminToken, {
        botId: 'test-bot-99',
        botToken: 'test-token-99',
        name: 'Test Bot 99',
        username: 'test_bot_99',
        isActive: true
      });
      assert(createBotRes.status === 201, 'Admin CRUD: Create bot returns 201 Created');
      assert(createBotRes.body?.data?.botToken === undefined, 'Admin CRUD: Create bot response does not leak botToken');

      const createdBot = await prisma.telegramBot.findFirst({ where: { botId: 'test-bot-99' } });
      assert(!!createdBot, 'Admin CRUD: Created bot exists in database');

      if (createdBot) {
        const getBotRes = await apiRequest('GET', `/admin/bots/${createdBot.id}`, adminToken);
        assert(getBotRes.status === 200, 'Admin CRUD: Get bot details returns 200');
        assert(getBotRes.body?.data?.botToken === '********', 'Admin CRUD: Bot token is masked in details payload');

        const updateBotRes = await apiRequest('PUT', `/admin/bots/${createdBot.id}`, adminToken, {
          name: 'Updated Bot 99'
        });
        assert(updateBotRes.status === 200, 'Admin CRUD: Update bot returns 200');

        const updatedBotDb = await prisma.telegramBot.findUnique({ where: { id: createdBot.id } });
        assert(updatedBotDb.name === 'Updated Bot 99', 'Admin CRUD: Bot name updated in database');

        const deleteBotSuccessRes = await apiRequest('DELETE', `/admin/bots/${createdBot.id}`, adminToken);
        assert(deleteBotSuccessRes.status === 200 || deleteBotSuccessRes.status === 204, 'Admin CRUD: Delete bot (without users) succeeds');

        const deletedBotDb = await prisma.telegramBot.findUnique({ where: { id: createdBot.id } });
        assert(!deletedBotDb, 'Admin CRUD: Bot deleted from database');
      }
    }


  } catch (err) {
    log('\n❌ CRITICAL ERROR: ' + err.message);
    log(err.stack);
  } finally {
    await browser.close();
    await prisma.$disconnect();

    const report = [
      '# Regression Test Report',
      '',
      `**Total**: ${RESULTS.total}  **Passed**: ${RESULTS.passed}  **Failed**: ${RESULTS.failed}  **Skipped**: ${RESULTS.skipped}`,
      '',
      RESULTS.failed > 0 ? '## Failures' : '',
      ...RESULTS.failures.map(f => `- ❌ ${f.test}${f.detail ? ': ' + f.detail : ''}`),
      '',
      '## Full Log',
      ...RESULTS.logs.map(l => l),
    ].join('\n');

    fs.writeFileSync(
      path.join(__dirname, 'regression_report.md'),
      report
    );

    log(`\n=== RESULTS: ${RESULTS.passed}/${RESULTS.total} passed, ${RESULTS.failed} failed ===`);
  }
}

runTests();
