# Service API Integration Guide

This API lets external applications interact with Telegram through a simple,
authenticated HTTP endpoint. Authentication uses a static shared secret — no
database tokens or user accounts required.

## Base URL

```
http://your-domain.com
```

Replace with your actual domain in all examples below.

---

## Authentication

Every request must include an `Authorization` header using the **Bearer** scheme:

```http
Authorization: Bearer YOUR_CLIENT_SECRET
```

The `CLIENT_SECRET` is a static shared secret configured on the server via
environment variables. It is provided to you by your platform administrator.

> **Keep it secret.** Do not expose it in browser code, mobile apps,
> public repositories, or logs.

### Authentication rules

| Header | Result |
|--------|--------|
| `Authorization: Bearer abc123` | ✅ Allowed (if token matches) |
| `Authorization: abc123` | ❌ 401 — must use `Bearer` scheme |
| `Authorization: Basic abc123` | ❌ 401 — wrong scheme |
| *(header missing)* | ❌ 401 |
| `Authorization: Bearer wrong` | ❌ 401 — token mismatch |

---

## Endpoint

```
POST /api/services
```

### Request headers

```http
Authorization: Bearer YOUR_CLIENT_SECRET
Content-Type: application/json
```

### Request body

```json
{
  "service": "send_message",
  "chat_id": "123456789",
  "message": "Hello from API"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service` | string | Yes | The service to run. See [Available services](#available-services). |
| `chat_id` | string | Depends on service | Telegram chat ID or `@username`. |
| `message` | string | Depends on service | Message text (1–4 096 characters). |

---

## Available Services

### `send_message`

Sends a text message to a Telegram chat using the server's configured bot.

#### Required fields

| Field | Description |
|-------|-------------|
| `chat_id` | Telegram numeric chat ID (e.g. `"123456789"`) or channel username (e.g. `"@mychannel"`) |
| `message` | Text to send — must be non-empty, max 4 096 characters |

#### Success response

```json
{
  "success": true,
  "data": {
    "message_id": 987,
    "chat_id": "123456789"
  }
}
```

#### Telegram failure response

```json
{
  "success": false,
  "message": "Failed to send Telegram message",
  "error": {
    "code": 400,
    "description": "Bad Request: chat not found"
  }
}
```

---

## Error Reference

All error responses follow this shape:

```json
{
  "success": false,
  "message": "Human-readable reason"
}
```

| HTTP Status | Cause | Resolution |
|------------|-------|------------|
| `400` | Missing or invalid field (e.g. empty `message`) | Check all required fields |
| `400` | Unsupported `service` value | Use a supported service name |
| `401` | Missing `Authorization` header | Add `Authorization: Bearer <secret>` |
| `401` | Wrong scheme (not `Bearer`) | Use `Authorization: Bearer <secret>` |
| `401` | Incorrect token | Verify your `CLIENT_SECRET` |
| `500` | Telegram API or network error | Retry or contact support |

---

## Examples

### curl

```bash
# Send a message
curl -X POST https://your-domain.com/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLIENT_SECRET" \
  -d '{
    "service": "send_message",
    "chat_id": "123456789",
    "message": "Hello from the API!"
  }'
```

```bash
# Send to a public channel by @username
curl -X POST https://your-domain.com/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLIENT_SECRET" \
  -d '{
    "service": "send_message",
    "chat_id": "@mychannel",
    "message": "Broadcast announcement"
  }'
```

```bash
# Missing secret -> 401
curl -X POST https://your-domain.com/api/services \
  -H "Content-Type: application/json" \
  -d '{"service": "send_message", "chat_id": "123456789", "message": "Hi"}'
# -> {"success":false,"message":"Unauthorized"}
```

---

### JavaScript / TypeScript (fetch)

```typescript
async function sendTelegramMessage(chatId: string, message: string) {
  const response = await fetch('https://your-domain.com/api/services', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CLIENT_SECRET}`,
    },
    body: JSON.stringify({
      service: 'send_message',
      chat_id: chatId,
      message,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message ?? 'Service request failed');
  }

  return data.data; // { message_id, chat_id }
}
```

---

### Python (requests)

```python
import os
import requests

def send_telegram_message(chat_id: str, message: str) -> dict:
    response = requests.post(
        'https://your-domain.com/api/services',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {os.environ["CLIENT_SECRET"]}',
        },
        json={
            'service': 'send_message',
            'chat_id': chat_id,
            'message': message,
        },
        timeout=15,
    )
    data = response.json()

    if not data.get('success'):
        raise RuntimeError(data.get('message', 'Service request failed'))

    return data['data']  # { message_id, chat_id }
```

---

### PHP (cURL)

```php
function sendTelegramMessage(string $chatId, string $message): array {
    $secret = getenv('CLIENT_SECRET');

    $ch = curl_init('https://your-domain.com/api/services');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            "Authorization: Bearer {$secret}",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'service'  => 'send_message',
            'chat_id'  => $chatId,
            'message'  => $message,
        ]),
        CURLOPT_TIMEOUT => 15,
    ]);

    $body = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($body, true);
    if (!$data['success']) {
        throw new RuntimeException($data['message'] ?? 'Service request failed');
    }

    return $data['data']; // ['message_id' => ..., 'chat_id' => ...]
}
```

---

## Environment Variables (server-side)

The server must have these variables set:

| Variable | Description |
|----------|-------------|
| `CLIENT_SECRET` | The shared secret clients send in `Authorization: Bearer` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token used to send messages |

---

## Integration Tips

- Store `CLIENT_SECRET` in a server-side secret manager or environment variable — never in client-side code, mobile apps, or version control.
- Always use HTTPS in production to protect the secret in transit.
- A `200` response with `"success": true` means Telegram accepted the message. It does not guarantee the recipient has read it.
- The API has a 10-second timeout on Telegram API calls. If the Telegram network is unavailable, you will receive a `500`-range error — retry with backoff.
- New services will be added using the same endpoint; only the `service` value and its required fields will change.
