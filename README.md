# Secure Entry Gateway PoC

A Zero Trust API gateway PoC demonstrating that backend compute is reachable only through a central, JWT-verifying gateway.

## Traffic flow

```text
                 OIDC Provider
                (Auth0/Okta/etc.)
                       |
                 access token (JWT)
                       |
                       v
Client ---> :3010 Gateway ---> :3001 Backend
             |      |              |
             |      +-- X-Verified-User
             |      +-- JWKS cache  |
             |      +-- iss/aud/exp |
             |                       +-- NO JWT validation
             +-- invalid/missing --> 401
                                     missing gateway header --> 403
```

## Security boundary

The backend deliberately does **not** validate JWTs. The gateway is the authentication enforcement point. The backend accepts traffic only when `X-Verified-User` is present.

**Important production note:** a header alone is not a cryptographic trust boundary. In production, the backend must be network-isolated from clients (private subnet/security group/service mesh), and the gateway-to-backend path should be authenticated (mTLS, private networking, or signed internal identity). This PoC demonstrates the requested header contract but should not be exposed directly to an untrusted network.

## Prerequisites

- Node.js 20+
- npm 10+
- An OIDC provider such as Auth0, Okta Developer, or Cognito

## OIDC setup

Create an API/resource server in your OIDC provider and a test user. Configure the API's audience and issuer. Request an access token whose `aud` matches the API audience.

Copy the example environment file:

```bash
cp gateway/.env.example gateway/.env
```

Set:

```dotenv
PORT=3000
BACKEND_URL=http://localhost:3001
OIDC_ISSUER=https://dev-kru1e87c7gr0dixw.au.auth0.com/
OIDC_AUDIENCE=https://secure-entry-api
OIDC_JWKS_URI=https://dev-kru1e87c7gr0dixw.au.auth0.com/.well-known/jwks.json
JWKS_CACHE_TTL_MS=3600000
LOG_LEVEL=info
```

`OIDC_ISSUER` must be the exact issuer URL published by your provider. `OIDC_JWKS_URI` should be the provider's published JWKS endpoint. The implementation caches JWKS locally and does not download keys for every request.

## Install and run

```bash
npm install
npm --prefix gateway install
npm --prefix backend install
```

Terminal 1:

```bash
npm --prefix backend run dev
```

Terminal 2:

```bash
npm --prefix gateway run dev
```

Gateway: `http://localhost:3000`
Backend: `http://localhost:3001`

## Test scenarios

### 1. No token: gateway blocks request

```bash
curl -i http://localhost:3000/api/users
```

Expected: `401 Unauthorized`.

### 2. Direct backend access: backend blocks request

```bash
curl -i http://localhost:3001/api/users
```

Expected: `403 Forbidden` because no `X-Verified-User` header exists.

### 3. Valid token: gateway verifies and forwards

```bash
export TOKEN='eyJ...'
curl -i http://localhost:3000/api/users -H "Authorization: Bearer $TOKEN"
```

Expected: `200 OK`, with the backend receiving the verified subject as `X-Verified-User`.

### 4. Tampered/expired/wrong-audience token

```bash
curl -i http://localhost:3000/api/users -H "Authorization: Bearer $BAD_TOKEN"
```

Expected: `401 Unauthorized`; the backend is not contacted.

## API

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users` body `{ "name": "Alice", "email": "alice@example.com" }`
- `PUT /api/users/:id` body `{ "name": "Alice Updated", "email": "alice2@example.com" }`
- `DELETE /api/users/:id`

