# Client service API

`POST /client/service` dispatches a service handler selected by the `service`
field. Send an API token in the `Authorization` header:

```http
Authorization: Bearer tg_client_<client-token>
Content-Type: application/json
```

```json
{
  "service": "send_message",
  "payload": {
    "bot_id": "123",
    "chat_id": "456",
    "text": "Hello world"
  }
}
```

`bot_id` accepts either this application's numeric bot record ID or Telegram's
bot ID. `chat_id` is the Telegram chat ID and must already exist for that bot
in `TelegramUser`; this lets outgoing messages be persisted in the existing
conversation history.

Authentication uses `passport-http-bearer` through the `api-token` strategy.
`AuthGuard('api-token')` protects the route and the `@CurrentAuth()` decorator
receives the Passport `req.user` principal.

Create tokens through `ApiTokenService.createToken`. A `CLIENT` token must not
have an `agentId`; a `PERSONAL` token must have one. Grant `send_message` (or
`*`) in `permissions`. The returned plaintext token is shown once and the database
retains only its SHA-256 hash.

To add a service, implement `ClientServiceHandler`, inject its dependencies,
and add it to the `CLIENT_SERVICE_HANDLERS` factory in `ClientServiceModule`.
Handlers receive `context.token`; `user` is `null` for client tokens and is set
to the associated `Agent` for personal tokens. `Agent` is this app's existing
user identity model.
