# Client API Integration Guide

This API lets external applications send messages through a configured Telegram
bot. The API uses an opaque Bearer token; it does not use the web application's
JWT login token.

## Base URL

Replace `https://your-domain.com` in the examples with your platform's URL.

## Authentication

Every request must include the API token supplied by your platform administrator:

```http
Authorization: Bearer tg_client_your_client_token
Content-Type: application/json
```

Client tokens normally start with `tg_client_`; personal tokens normally start with
`tg_pat_`. The prefix is only descriptive—both are sent in exactly the same Bearer
header format.

Keep the token secret. It is shown only when created and cannot be retrieved
again. If it is lost or exposed, ask an administrator to revoke it and create a
replacement.

## Send a message

`POST /client/service`

```bash
curl --request POST 'https://your-domain.com/client/service' \
  --header 'Authorization: Bearer tg_client_your_client_token' \
  --header 'Content-Type: application/json' \
  --data '{
    "service": "send_message",
    "payload": {
      "bot_id": "123",
      "chat_id": "456",
      "text": "Hello world"
    }
  }'
```

### Request body

| Field | Required | Description |
| --- | --- | --- |
| `service` | Yes | Service to perform. Use `send_message`. |
| `payload.bot_id` | Yes | The platform bot record ID or Telegram bot ID. |
| `payload.chat_id` | Yes | Telegram chat ID of the recipient. The chat must already exist for this bot in the platform. |
| `payload.text` | Yes | Text to send, up to 4,096 characters. |

### Success response

The API wraps successful responses in `status` and `data`:

```json
{
  "status": true,
  "data": {
    "message": {
      "id": "message-uuid",
      "telegramUserId": "chat-uuid",
      "messageType": "text",
      "text": "Hello world",
      "messageId": "987654",
      "status": "sent",
      "createdAt": "2026-08-16T12:00:00.000Z"
    },
    "tokenType": "client"
  }
}
```

`tokenType` is `client` for a machine token and `personal` for a personal
token. It is informational only.

## Errors

Errors use this structure:

```json
{
  "status": false,
  "data": {
    "message": "Error description"
  }
}
```

Common HTTP statuses:

| Status | Meaning | Resolution |
| --- | --- | --- |
| `400` | Invalid body or unsupported service | Check the JSON fields and service name. |
| `401` | Missing, invalid, or expired token | Supply a valid current Bearer token. |
| `403` | Token lacks `send_message` permission | Ask an administrator to grant the permission. |
| `404` | Bot or chat is unknown | Verify `bot_id` and `chat_id`; the user must have previously contacted that bot. |
| `500` | Message could not be delivered | Retry only if appropriate, then contact support. |

## Permissions

An API token is granted one or more permissions by the platform administrator.
To call the endpoint above, it needs the `send_message` permission. A token with
the `*` permission may call every available client service.

## Integration guidance

- Store the token in a server-side secret manager or environment variable; do
  not expose it in browser code, mobile apps, repositories, or logs.
- Use HTTPS in production.
- Treat a successful response as confirmation that Telegram accepted the send
  request. It does not guarantee that the recipient has read the message.
- New services may be added later using the same `/client/service` endpoint;
  their `service` value and payload will be documented separately.
