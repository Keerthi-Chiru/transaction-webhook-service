import express from "express";
import { createTransaction, getTransactionById } from "./transaction-repository.js";




const app = express();

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        status: "HEALTHY",
        current_time: new Date().toISOString()
    });
});

// Accept transaction webhook
app.post("/v1/webhooks/transactions", async (req, res) => {
    const transaction = req.body;

    // Validate the request body
    if (
        !transaction ||
        typeof transaction !== "object" ||
        Array.isArray(transaction) ||
        Object.keys(transaction).length === 0
    ) {
        res.status(400).json({
            message: "Transaction is missing or invalid"
        });
        return;
    }

    // Validate transaction ID
    if (
        typeof transaction.transaction_id !== "string" ||
        transaction.transaction_id.trim() === ""
    ) {
        res.status(400).json({
            message: "Transaction ID is missing"
        });
        return;
    }

    // Validate source account
    if (
        typeof transaction.source_account !== "string" ||
        transaction.source_account.trim() === ""
    ) {
        res.status(400).json({
            message: "Source Account is missing"
        });
        return;
    }

    // Validate destination account
    if (
        typeof transaction.destination_account !== "string" ||
        transaction.destination_account.trim() === ""
    ) {
        res.status(400).json({
            message: "Destination Account is missing"
        });
        return;
    }

    // Validate amount
    if (
        typeof transaction.amount !== "number" ||
        !Number.isFinite(transaction.amount) ||
        transaction.amount <= 0
    ) {
        res.status(400).json({
            message: "Amount is missing or invalid"
        });
        return;
    }

    // Validate currency
    if (
        typeof transaction.currency !== "string" ||
        transaction.currency.trim() === ""
    ) {
        res.status(400).json({
            message: "Currency is missing or invalid"
        });
        return;
    }

    try {
        // Persist the transaction before acknowledging the webhook
        const result = await createTransaction(transaction);

        // Acknowledge duplicate transactions without inserting them again
        if (!result.created) {
            res.status(202).json({
                message: "Transaction already accepted",
                transaction_id: transaction.transaction_id
            });
            return;
        }

        // New transaction successfully persisted
        res.status(202).json({
            message: "Transaction accepted",
            transaction_id: result.transaction.transaction_id,
            status: result.transaction.status
        });
    } catch (error) {
        // Log details on the server, not in the API response
        console.error("Failed to save transaction:", error);

        res.status(500).json({
            message: "Unable to accept transaction"
        });
    }
});



app.get("/v1/transactions/:transaction_id", async (req, res) => {
    const { transaction_id } = req.params;

    try {
        const transaction = await getTransactionById(transaction_id);

        if (!transaction) {
            res.status(404).json({
                message: "Transaction not found"
            });
            return;
        }

        res.status(200).json({
            transaction_id: transaction.transaction_id,
            source_account: transaction.source_account,
            destination_account: transaction.destination_account,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            created_at: transaction.created_at,
            processed_at: transaction.processed_at
        });
    } catch (error) {
        console.error("Failed to retrieve transaction:", error);

        res.status(500).json({
            message: "Unable to retrieve transaction"
        });
    }
});


app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            message: "Invalid JSON body"
        });
    }

    console.error("Unhandled request error:", err);

    return res.status(500).json({
        message: "Internal server error"
    });
});

export default app;