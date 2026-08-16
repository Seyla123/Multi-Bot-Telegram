# Regression Test Report

**Total**: 64  **Passed**: 64  **Failed**: 0  **Skipped**: 0



## Full Log
=== Starting Regression Suite ===

--- Database Seed ---

--- Launching Browser ---

=== AUTH TESTS ===
T1. Login with valid credentials
✅ PASS: T1: Login with valid credentials
T2. Session persists after refresh
✅ PASS: T2: Session persists after browser refresh
T3. Logout
✅ PASS: T3: Logout clears session
T4. Dashboard inaccessible without auth
✅ PASS: T4: Dashboard inaccessible without authentication

=== PAGINATION TESTS ===
T5. Open chat with 50+ messages
✅ PASS: T5: Chat opens and shows messages
  Initial message count: 10
✅ PASS: T6: Initial request loads exactly 10 messages
  ScrollHeight: 729, ScrollTop: 472
  After scroll-to-top: 20 messages (was 10)
✅ PASS: T7: Scroll-to-top fetches more messages (10 → 20)
  New scrollHeight: 1344, newScrollTop: 615
✅ PASS: T8: Scroll position preserved after prepend (expected ~615, got 615)

=== SENDING TESTS ===
T9. Send text message
[INTERCEPTOR] POST request to http://localhost:5173/telegram/messages/e5cb6248-5d27-43cb-aebf-960eaa700ee4 with body: {"text":"Test outgoing message","telegramId":"123456789"}
✅ PASS: T9: Message immediately shows "Sending..." state
✅ PASS: T10: Message transitions from Sending → Sent

=== FAILED / RETRY TESTS ===
T11. Forced failure + Retry → Sent
[INTERCEPTOR] POST request to http://localhost:5173/telegram/messages/e5cb6248-5d27-43cb-aebf-960eaa700ee4 with body: {"text":"Fail me","telegramId":"123456789"}
[INTERCEPTOR] Mocking 500 error for Fail me request
  [PAGE ERROR]: Simulated 500
apiFetch (http://localhost:5173/src/services/api.ts?t=1786878647051:19:9)
async Object.sendMessage (http://localhost:5173/src/services/telegramService.ts?t=1786878647051:94:27)
async sendMessage (http://localhost:5173/src/composables/useTelegramMessages.ts?t=1786878647051:145:21)
✅ PASS: T11a: Forced 500 shows Failed state with Retry button
[INTERCEPTOR] POST request to http://localhost:5173/telegram/messages/e5cb6248-5d27-43cb-aebf-960eaa700ee4 with body: {"text":"Fail me","telegramId":"123456789"}
✅ PASS: T11b: Successful retry removes Failed/Retry UI
✅ PASS: T11c: After retry, no "Failed" text remains in message bubbles

=== REPLY / CONTEXT MENU TESTS ===
T12. Context menu Reply
✅ PASS: T12: Context menu right click successfully triggered
✅ PASS: T12a: Context menu opens with Reply option
✅ PASS: T12b: Context menu Reply shows "Reply to Message" preview in input
✅ PASS: T12c: Cancel reply removes reply preview

=== AGENT IDENTITY TESTS ===
✅ PASS: T13: Sent messages are attributed to Agent A in DB

=== CONVERSATION ASSIGNMENT TESTS ===
✅ PASS: T14: Agent A login returns JWT token
✅ PASS: T15: Agent B login returns JWT token
✅ PASS: T15a: Protected endpoint without token returns 401
✅ PASS: T15b: Protected endpoint with invalid token returns 401
✅ PASS: T15c: Invalid login returns 401/failure
✅ PASS: T16: Agent A assigns unassigned conversation to themselves
✅ PASS: T17: Agent B cannot steal conversation (409 Conflict)
✅ PASS: T18: Agent B cannot unassign Agent A conversation (403)
✅ PASS: T19: Agent A resolves their conversation
✅ PASS: T20: Agent A reopens conversation
✅ PASS: T21: Agent A unassigns their own conversation
✅ PASS: T22: Concurrent assignment: 1 wins, 1 gets 409 (wins=1, conflicts=1)
✅ PASS: T23: filter=unassigned returns unassigned OPEN conversations
✅ PASS: T24: filter=mine returns conversations assigned to Agent A
✅ PASS: T25: filter=mine for Agent B does not include Agent A conversations
✅ PASS: T26: filter=resolved returns RESOLVED conversations
✅ PASS: T27: Protected endpoints require authentication (401 without token)

=== SIDEBAR FILTER UI TESTS ===
✅ PASS: T28: Sidebar shows All/Mine/Unassigned/Resolved filter buttons
✅ PASS: T29: Unassigned filter shows the unassigned conversation

=== MOBILE TESTS ===
✅ PASS: T30: Mobile viewport renders without crash

=== AGENT B SENDING TESTS ===
[INTERCEPTOR] POST request to http://localhost:5173/telegram/messages/e5cb6248-5d27-43cb-aebf-960eaa700ee4 with body: {"text":"Message from Agent B","telegramId":"123456789"}
✅ PASS: T31: Messages from Agent B attributed to Agent B in DB
✅ PASS: T32: Agent B identity not confused with Agent A

=== ADMIN PANEL SECURITY & CRUD TESTS ===
✅ PASS: Admin: Login admin@support.com returns JWT token
✅ PASS: Admin Security: Unauthenticated request to /admin/* returns 401
✅ PASS: Admin Security: Normal agent GET /admin/bots returns 403 Forbidden
✅ PASS: Admin Security: Normal agent POST /admin/bots returns 403 Forbidden
✅ PASS: Admin Security: Normal agent GET /admin/agents returns 403 Forbidden
✅ PASS: Admin Security: Admin GET /admin/bots returns 200
✅ PASS: Admin Security: Admin GET /admin/agents returns 200
✅ PASS: Admin Security: Admin GET /admin/telegram-users returns 200
✅ PASS: Admin Security: Admin GET /admin/telegram-messages returns 200
✅ PASS: Admin Security: Admin GET /admin/videos returns 200
✅ PASS: Admin Security: List agents payload does not expose passwordHash
✅ PASS: Admin Security: List bots payload does not expose botToken
✅ PASS: Admin Security: Self-deletion is blocked (400)
✅ PASS: Admin Security: Deleting agent with active messages/conversations is blocked (400)
✅ PASS: Admin Security: Deleting bot with active Telegram users is blocked (400)
✅ PASS: Admin CRUD: Create bot returns 201 Created
✅ PASS: Admin CRUD: Create bot response does not leak botToken
✅ PASS: Admin CRUD: Created bot exists in database
✅ PASS: Admin CRUD: Get bot details returns 200
✅ PASS: Admin CRUD: Bot token is masked in details payload
✅ PASS: Admin CRUD: Update bot returns 200
✅ PASS: Admin CRUD: Bot name updated in database
✅ PASS: Admin CRUD: Delete bot (without users) succeeds
✅ PASS: Admin CRUD: Bot deleted from database