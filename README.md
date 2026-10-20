# Transaction Webhook Service

A Node.js REST API that accepts transaction webhooks, stores transactions in PostgreSQL, prevents duplicate transaction creation, and processes accepted transactions asynchronously using a background worker.

## Live Deployment

- **API Base URL:** https://transaction-webhook-api-uc8p.onrender.com
- **Health Check:** https://transaction-webhook-api-uc8p.onrender.com/
- **GitHub Repository:** https://github.com/Keerthi-Chiru/transaction-webhook-service
- **API Hosting:** Render
- **Background Worker:** Northflank
- **Database:** Supabase PostgreSQL

## Features

- **Webhook endpoint:** Accepts transaction events and responds with HTTP `202 Accepted`.
- **Durable persistence:** Stores transaction records in PostgreSQL.
- **Idempotency:** Uses `transaction_id` as the primary key to prevent duplicate records.
- **Asynchronous processing:** A background worker simulates an external API call with a 30-second delay.
- **Transaction status:** Retrieves transaction details and processing status.
- **Input validation:** Rejects invalid payloads and malformed JSON.
- **Automated tests:** Uses Vitest and Supertest to test the API.

## Tech Stack

- Node.js 20+
- Express.js
- PostgreSQL and Supabase
- `pg` for database access
- Vitest and Supertest for testing
- dotenv for environment configuration

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:Keerthi-Chiru/transaction-webhook-service.git
cd transaction-webhook-service
```

Alternatively, clone using HTTPS:

```bash
git clone https://github.com/Keerthi-Chiru/transaction-webhook-service.git
cd transaction-webhook-service
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=your_postgresql_connection_string
```

Replace the placeholder with your PostgreSQL connection string. Never commit `.env` or expose database credentials.

### 4. Set up the database

Execute the following SQL against your PostgreSQL database:

```sql
CREATE TABLE transactions (
    transaction_id TEXT PRIMARY KEY,
    source_account TEXT NOT NULL,
    destination_account TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROCESSING'
        CHECK (status IN ('PROCESSING', 'PROCESSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processing_started_at TIMESTAMPTZ
);
```

If the table already exists, ensure the `processing_started_at` column is present:

```sql
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
```

### 5. Start the API

```bash
npm start
```

The API listens on port `3000` locally, or the port provided by the hosting platform.

For development, if the configured script is available:

```bash
npm run dev
```

### 6. Start the background worker

In a separate terminal, run:

```bash
node worker.js
```

The worker polls PostgreSQL for transactions awaiting processing, simulates the external API call, and updates transaction status.

Run the worker as a separate process from the API.

## API Endpoints

### 1. Health Check

`GET /`

**Live endpoint:** https://transaction-webhook-api-uc8p.onrender.com/

Returns the service health status and current timestamp.

Example response:

```json
{
  "status": "HEALTHY",
  "current_time": "2026-10-20T10:00:00.000Z"
}
```

### 2. Accept a Transaction Webhook

`POST /v1/webhooks/transactions`

**Live endpoint:** `https://transaction-webhook-api-uc8p.onrender.com/v1/webhooks/transactions`

Example request:

```json
{
  "transaction_id": "TXN_1001",
  "source_account": "ACC001",
  "destination_account": "ACC002",
  "amount": 250.00,
  "currency": "INR"
}
```

Example successful response (`202 Accepted`):

```json
{
  "message": "Transaction accepted",
  "transaction_id": "TXN_1001",
  "status": "PROCESSING"
}
```

Repeated submissions with the same transaction ID do not create additional records.

Example curl command:

```bash
curl -i -X POST \
  "https://transaction-webhook-api-uc8p.onrender.com/v1/webhooks/transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_1001",
    "source_account": "ACC001",
    "destination_account": "ACC002",
    "amount": 250.00,
    "currency": "INR"
  }'
```

### 3. Retrieve a Transaction

`GET /v1/transactions/:transaction_id`

**Live endpoint example:**

```bash
curl "https://transaction-webhook-api-uc8p.onrender.com/v1/transactions/TXN_1001"
```

The response includes transaction details, status, creation timestamp, and processing timestamp.

Possible statuses:

- `PROCESSING`
- `PROCESSED`

If the transaction does not exist, the API returns HTTP `404 Not Found`.

## Testing

Run the automated test suite:

```bash
npm test
```

The current test suite contains seven tests covering:

- Health endpoint and timestamp.
- Missing transaction ID.
- Duplicate webhook submissions.
- Malformed JSON.
- Invalid transaction amounts.
- Unknown transaction IDs.
- Retrieval of existing transactions.

The seven tests passed in the latest reported test run.

## Architecture

The service consists of three components:

1. **API service — Render:** Receives webhook requests, validates payloads, persists transactions, and responds with HTTP `202 Accepted`.
2. **Database — Supabase PostgreSQL:** Stores transaction data and processing state.
3. **Background worker — Northflank:** Polls for transactions awaiting processing, simulates a 30-second external API operation, and updates the transaction status.

### Processing Flow

1. The API receives a transaction webhook.
2. The request payload is validated.
3. The transaction is inserted into PostgreSQL with status `PROCESSING`.
4. The API responds with HTTP `202 Accepted`.
5. The worker claims a transaction for processing.
6. The worker simulates an external API call lasting approximately 30 seconds.
7. The worker updates the transaction status to `PROCESSED`.
8. Clients retrieve the latest status through the transaction lookup endpoint.

## Design Decisions

**Database-backed idempotency:** The transaction ID is the primary key, and PostgreSQL conflict handling prevents duplicate transaction records.

**Asynchronous processing:** The webhook handler does not wait for the simulated 30-second operation to complete.

**Persistent processing state:** Transaction records and their processing status are stored in PostgreSQL rather than only in application memory.

**Separate worker process:** Background processing is independent of the API request lifecycle.

## Limitations and Future Improvements

- Concurrent webhook requests did not consistently meet the assessment's 500 ms response-time target in local testing.
- The worker uses polling and a processing-claim timeout. Stronger lease handling, retry policies, and dead-letter handling would improve recovery and reliability.
- Production hardening could include structured logging, monitoring, graceful shutdown, and database connection-limit tuning.
- Additional integration tests could cover concurrent duplicate requests, worker recovery, and end-to-end processing through to `PROCESSED`.

## License

No license has been specified. Add a license if you intend to distribute this project under explicit reuse terms.
