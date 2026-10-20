import { describe, it, expect } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "./app.js";
import { getTransactionById } from "./transaction-repository.js";

describe("Transaction Webhook API", () => {
    // Test 1: Health check
    it("should return HTTP 200 and a healthy status", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("HEALTHY");
        expect(response.body.current_time).toBeDefined();
        expect(Number.isNaN(Date.parse(response.body.current_time))).toBe(false);
    });

    // Test 2: Reject a webhook with a missing transaction ID
    it("should reject a webhook with a missing transaction ID", async () => {
        const response = await request(app)
            .post("/v1/webhooks/transactions")
            .send({
                source_account: "ACC001",
                destination_account: "ACC002",
                amount: 250,
                currency: "INR"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Transaction ID is missing");
    });

    // Test 3: Accept a valid transaction and reject duplicate processing
    it("should accept duplicate webhooks without creating duplicate transactions", async () => {
        const transaction = {
            transaction_id: `TXN_TEST_${randomUUID()}`,
            source_account: "ACC001",
            destination_account: "ACC002",
            amount: 250,
            currency: "INR"
        };

        const firstResponse = await request(app)
            .post("/v1/webhooks/transactions")
            .send(transaction);

        const secondResponse = await request(app)
            .post("/v1/webhooks/transactions")
            .send(transaction);

        expect(firstResponse.status).toBe(202);
        expect(firstResponse.body.message).toBe("Transaction accepted");
        expect(firstResponse.body.transaction_id).toBe(transaction.transaction_id);
        expect(firstResponse.body.status).toBe("PROCESSING");

        expect(secondResponse.status).toBe(202);
        expect(secondResponse.body.message).toBe("Transaction already accepted");
        expect(secondResponse.body.transaction_id).toBe(transaction.transaction_id);

        const storedTransaction = await getTransactionById(
            transaction.transaction_id
        );

        expect(storedTransaction).not.toBeNull();
        expect(storedTransaction.transaction_id).toBe(transaction.transaction_id);
        expect(storedTransaction.source_account).toBe(transaction.source_account);
        expect(storedTransaction.destination_account).toBe(
            transaction.destination_account
        );
    });

    // Test 4: Reject malformed JSON
    it("should reject malformed JSON with HTTP 400", async () => {
        const response = await request(app)
            .post("/v1/webhooks/transactions")
            .set("Content-Type", "application/json")
            .send('{"transaction_id":');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid JSON body");
    });

    // Test 5: Reject an invalid transaction amount
    it("should reject a transaction with an invalid amount", async () => {
        const response = await request(app)
            .post("/v1/webhooks/transactions")
            .send({
                transaction_id: `TXN_INVALID_${randomUUID()}`,
                source_account: "ACC001",
                destination_account: "ACC002",
                amount: -100,
                currency: "INR"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Amount is missing or invalid");
    });

    // Test 6: Return 404 for a transaction that does not exist
    it("should return 404 for an unknown transaction ID", async () => {
        const response = await request(app)
            .get(`/v1/transactions/TXN_DOES_NOT_EXIST_${randomUUID()}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Transaction not found");
    });


    it("should retrieve an existing transaction by ID", async () => {
    const transaction = {
        transaction_id: `TXN_GET_${randomUUID()}`,
        source_account: "ACC001",
        destination_account: "ACC002",
        amount: 500,
        currency: "INR"
    };

    const createResponse = await request(app)
        .post("/v1/webhooks/transactions")
        .send(transaction);

    expect(createResponse.status).toBe(202);

    const getResponse = await request(app)
        .get(`/v1/transactions/${transaction.transaction_id}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.transaction_id).toBe(transaction.transaction_id);
    expect(getResponse.body.source_account).toBe(transaction.source_account);
    expect(getResponse.body.destination_account).toBe(
        transaction.destination_account
    );
    expect(Number(getResponse.body.amount)).toBe(transaction.amount);
    expect(getResponse.body.currency).toBe(transaction.currency);
    expect(getResponse.body.status).toBe("PROCESSING");
    expect(getResponse.body.created_at).toBeDefined();
    expect(getResponse.body.processed_at).toBeNull();
    });
});