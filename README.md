# Transaction Webhook Service

A Node.js REST API that accepts transaction webhooks, stores transactions in PostgreSQL, prevents duplicate transaction creation, and processes accepted transactions asynchronously using a background worker.

## Features

- **Webhook endpoint:** Accepts incoming transaction events and responds with HTTP `202 Accepted`.
- **Durable persistence:** Stores transactions in PostgreSQL.
- **Idempotency:** Uses `transaction_id` as a primary key to prevent duplicate transaction records.
- **Asynchronous processing:** A background worker simulates an external API call with a 30-second delay.
- **Transaction status:** Supports retrieving transaction details and processing status.
- **Input validation:** Rejects invalid payloads and malformed JSON.
- **Automated tests:** Uses Vitest and Supertest to test the API.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Supabase PostgreSQL
- `pg` for database access
- Vitest and Supertest for testing
- dotenv for environment configuration

## Prerequisites

- Node.js 20 or later
- npm
- A PostgreSQL database

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
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

Replace the placeholder with your PostgreSQL connection string. Do not commit `.env` or expose database credentials.

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

The API starts on port `3000`.

For development, use:

```bash
npm run dev
```

### 6. Start the background worker

In a separate terminal, from the project directory, run:

```bash
node worker.js
```

The worker polls PostgreSQL for pending transactions, simulates an external API call, and updates the transaction status.

Run the worker as a separate process from the API.

## API Endpoints

### Health Check

`GET /`

Returns the service health status and current timestamp.

Example response:

```json
{
  "status": "HEALTHY",
  "current_time": "2026-10-20T10:00:00.000Z"
}
```

### Accept a Transaction Webhook

`POST /v1/webhooks/transactions`

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

A successfully accepted transaction returns HTTP `202 Accepted`.

Example response:

```json
{
  "message": "Transaction accepted",
  "transaction_id": "TXN_1001",
  "status": "PROCESSING"
}
```

Repeated submissions with the same transaction ID do not create additional records.

### Retrieve a Transaction

`GET /v1/transactions/:transaction_id`

Example:

```bash
curl http://localhost:3000/v1/transactions/TXN_1001
```

The response includes the transaction details, status, creation timestamp, and processing timestamp.

Possible statuses:

- `PROCESSING`
- `PROCESSED`

If the transaction does not exist, the API returns HTTP `404 Not Found`.

## Testing

Run the automated test suite:

```bash
npm test
```

The tests cover the health endpoint, input validation, duplicate webhooks, malformed JSON, invalid amounts, unknown transaction IDs, and retrieval of existing transactions.

The current test suite contains seven passing tests.

## Architecture

1. The API receives a transaction webhook.
2. The request payload is validated.
3. The transaction is inserted into PostgreSQL with status `PROCESSING`.
4. The API responds with HTTP `202 Accepted`.
5. The background worker claims a pending transaction.
6. The worker simulates an external API call lasting approximately 30 seconds.
7. The transaction is updated to `PROCESSED`.
8. Clients can retrieve the latest status through the transaction lookup endpoint.

## Design Decisions

**Database-backed idempotency:** The transaction ID is the primary key, and inserts use PostgreSQL conflict handling to prevent duplicate records.

**Asynchronous processing:** The webhook handler does not wait for the simulated 30-second external API operation to finish.

**Persistent processing state:** Transaction records and processing status are stored in PostgreSQL rather than only in application memory.

## Limitations and Future Improvements

- Concurrent webhook requests have not consistently met the assessment's 500 ms response-time target in local testing.
- The worker uses polling and a processing-claim timeout; stronger worker ownership, lease handling, and retry policies would improve recovery and reliability.
- Production deployment should use managed process supervision, appropriate database connection limits, structured logging, monitoring, and graceful shutdown.
- Additional integration tests should cover concurrent duplicate requests, worker recovery, and successful processing through to `PROCESSED`.

## License

Add a license if you intend to distribute this project publicly.
