# node-payment-micro

[![CI](https://github.com/d-Bharti001/node-payment-micro/actions/workflows/dev.yml/badge.svg?branch=dev)](https://github.com/d-Bharti001/node-payment-micro/actions/workflows/dev.yml)

A payments platform built as independent Node.js/TypeScript microservices, communicating over gRPC (synchronous calls) and Kafka (asynchronous events), deployed to Kubernetes.

## Architecture

<img src="./node-payment-micro.svg">

`api_gateway` is the only service reachable from outside the cluster. `ledger` and `email` are independent consumers of the same `payments` topic, in separate consumer groups.

### Services

| Service                                                | Description                                                                                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                                                 | Authenticates users and issues/validates JWTs.                                                                                         |
| `money_movement`                                       | Executes account-to-account transfers and exposes balance lookups.                                                                     |
| `ledger`                                               | Kafka consumer that records a debit/credit audit-trail row for every transaction.                                                      |
| `email`                                                | Kafka consumer that sends payment-notification emails (via Mailpit locally).                                                           |
| `api_gateway`                                          | The HTTP/REST facade - exposes `/login`, `/balance`, and `/transact`, translating them into gRPC calls to `auth` and `money_movement`. |
| `kafka`                                                | Self-hosted Kafka cluster (KRaft mode) carrying the `payments` topic.                                                                  |
| `email_mailpit`                                        | [Mailpit](https://mailpit.axllent.org/) - a fake local SMTP server + web UI, used for local development.                               |
| `auth_mysql` / `money_movement_mysql` / `ledger_mysql` | Dedicated MySQL instance per service - each service owns its own database.                                                             |

### Design highlights

A few things worth calling out about how correctness is handled under concurrency and partial failure:

- **Idempotency.** Every `/transact` call requires a client-generated `Idempotency-Key`. It's enforced with a `UNIQUE(from_user_id, idempotency_key)` constraint on the `transactions` table - the _insert itself_ is the atomic check-and-reserve, not a separate SELECT-then-INSERT (which would race). A retried request with the same key never re-processes; it just returns the original attempt's result, even under concurrent retries.
- **Transactional outbox.** `money_movement` never publishes to Kafka directly from the request path. It writes an event to its own `outbox` table in the _same database transaction_ as the balance update - eliminating the cases where money moves but no event fires, or an event fires for a transaction that got rolled back. A separate outbox-relay process polls that table and publishes to Kafka - so a Kafka outage delays delivery but can never lose the underlying transaction record.
- **Deadlock-free balance locking.** A transfer locks both the sender's and recipient's balance rows in a fixed order (ascending by user ID, regardless of who's debited or credited), so two concurrent transfers between the same pair of users - in either direction - can't deadlock against each other.
- **No shared database.** Each service owns its own MySQL instance and schema; nothing reaches across a service boundary to query another service's tables directly.

## API flow & sample usage

1. **Login** to get a JWT:

   ```
   curl -X POST http://api.node-payment-micro.local/login \
     -H "Content-Type: application/json" \
     -d '{"user_id": "buyer@email.com", "password": "buyer123"}'
   ```

   Output: `{ "jwt": "<token>" }`

2. **Check balance**:

   ```
   curl http://api.node-payment-micro.local/balance \
     -H "Authorization: Bearer <jwt>"
   ```

   Output: `{ "balance": "500000" }`

3. **Transact**, using a client-generated idempotency key (retrying the same key never double-charges):

   ```
   curl -X POST http://api.node-payment-micro.local/transact \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <jwt>" \
     -H "Idempotency-Key: <any-unique-string>" \
     -d '{"to_user_id": "georgio@email.com", "amount": 100}'
   ```

   Output: `{ "transaction_id": "<id>" }`

   This single call triggers the whole system: `money_movement` debits/credits the balances and writes an outbox event... the outbox relay publishes it to Kafka... `ledger` records the debit/credit pair... `email` sends a notification to both the payer and the payee (viewable in Mailpit dashboard).

Seeded accounts for local testing: `buyer@email.com` / `buyer123` (starting balance 500000) and `georgio@email.com` / `georgio123` (starting balance 0).

### Prerequisites

- Docker
- A local Kubernetes cluster - these instructions assume [minikube](https://minikube.sigs.k8s.io/) with its `ingress` addon enabled
- `kubectl`
- [`just`](https://github.com/casey/just) - used to run every deployment/inspection command below

### Building & pushing images

Each service builds and tags independently. Sample commands:

```
docker build -t dbharti001/auth-nodejs:1.0.0 auth/
docker push dbharti001/auth-nodejs:1.0.0

docker build -t dbharti001/money-movement-nodejs:1.0.0 money_movement/
docker push dbharti001/money-movement-nodejs:1.0.0

docker build -t dbharti001/ledger-nodejs:1.0.0 ledger/
docker push dbharti001/ledger-nodejs:1.0.0

docker build -t dbharti001/email-nodejs:1.0.0 email/
docker push dbharti001/email-nodejs:1.0.0

docker build -t dbharti001/payment-api-gateway-nodejs:1.0.0 api_gateway/
docker push dbharti001/payment-api-gateway-nodejs:1.0.0
```

### Starting the services

```
minikube start
minikube addons enable ingress

just start-services
```

`start-services` deploys everything in a proper order:

> namespace
> Kafka
> Mailpit
> each service's database
> `auth` service (migrate db, then seed db, then deploy)
> `money_movement` service (migrate db, then seed db, then deploy) `ledger` service (migrate db, then deploy)
> `email` service
> `api_gateway`

Each step waits for the previous one to actually be ready before moving on.

Then, in a separate terminal (minikube's Ingress isn't reachable from the host without this):

```
minikube tunnel
```

And map the Ingress hostname by adding an entry to `/etc/hosts`:

```
127.0.0.1  api.node-payment-micro.local
```

### Stopping the services

```
just stop-services
```

Stops everything in reverse dependency order.

### Accessing from the browser

#### API Gateway

**Swagger UI** (the api_gateway's interactive API docs) - once the Ingress + tunnel + hosts entry above are set up:

```
http://api.node-payment-micro.local/docs/swagger
```

To skip the Ingress/tunnel setup entirely, port-forward the gateway directly instead:

```
kubectl port-forward -n node-payment-micro svc/api-gateway-service 1337:1337
```

then open `http://localhost:1337/docs/swagger`.

#### Emails

**Mailpit** (see emails the `email` service has sent):

```
just mailpit-dashboard
```

then open `http://localhost:8025`.

### Local inspection

| Command                  | What it does                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `just db-auth`           | Opens a MySQL shell into `auth`'s database (users).                                    |
| `just db-money-movement` | Opens a MySQL shell into `money_movement`'s database (balances, transactions, outbox). |
| `just db-ledger`         | Opens a MySQL shell into `ledger`'s database (the debit/credit audit trail).           |
| `just mailpit-dashboard` | Port-forwards Mailpit's web UI to `http://localhost:8025`.                             |
| `just logs <service>`    | Tails a service's logs by its `app` label, e.g. `just logs ledger`.                    |

## Testing & CI

Every service has unit and integration tests ([Vitest](https://vitest.dev/)). The integration tests run against real dependencies started with [Testcontainers](https://testcontainers.com/): MySQL 8.4 with the real migrations applied, a real [Mailpit](https://mailpit.axllent.org/) SMTP server for `email`, and a real Kafka broker (`apache/kafka-native`) for `money_movement`, `ledger` and `email`. They exercise actual InnoDB locking, Kafka delivery and SMTP behavior instead of mocks. `api_gateway` needs no containers: its tests drive the real Express app, with only the two gRPC clients mocked.

Run them from inside a service folder (Node.js 22; the integration tests need Docker running, and the first run pulls the images):

```
npm test                  # unit + integration
npm run test:unit         # no Docker needed
npm run test:integration
```

What the tests pin down:

| Service          | Highlights                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `money_movement` | Concurrent retries with one idempotency key produce a single debit, credit and outbox event. Opposing concurrent transfers neither deadlock nor lose money. Failures roll back completely. The outbox relay retries failed sends, two relays never publish the same event (`FOR UPDATE SKIP LOCKED`), and it publishes each event to its own topic on a real Kafka broker. |
| `ledger`         | Redelivered events (including concurrent redelivery) are recorded once. The debit and credit are all-or-nothing. Consuming from a real Kafka broker, an event becomes a debit and a credit, a malformed message is skipped without blocking the ones after it, and a message whose handler failed is delivered again.                                                      |
| `email`          | One Kafka event becomes one email for each side of the payment, delivered through a real SMTP server. Malformed events are skipped without blocking the ones after them, SMTP failures are retried, and user-supplied text is HTML-escaped.                                                                                                                                |
| `auth`           | Login, and JWT validation: expired, wrong key, wrong issuer, wrong algorithm and tampered tokens are all rejected.                                                                                                                                                                                                                                                         |
| `api_gateway`    | gRPC-to-HTTP status mapping, authentication on protected routes, the caller's identity always comes from the token (never the request body), and internal errors are not leaked to clients.                                                                                                                                                                                |

### Continuous integration

GitHub Actions (`.github/workflows`) runs `npm ci`, the unit tests, the integration tests and `npm run build`:

- A push or pull request to `dev` runs all five services in parallel.
- A push to a service branch (`dev-auth`, `dev-money-mv`, `dev-ledger`, `dev-email`, `dev-api-gateway`) runs only that service.
