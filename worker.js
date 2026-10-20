import { pool } from "./db.js";
import { claimNextTransaction } from "./transaction-repository.js";


function simulateExternalApiCall() {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("External API call completed");
            resolve();
        }, 30_000);
    });
}



async function markTransactionProcessed(transactionId) {
    await pool.query(
        `UPDATE transactions
         SET status = 'PROCESSED',
             processed_at = NOW()
         WHERE transaction_id = $1`,
        [transactionId]
    );
}


async function processTransactions() {
    console.log("Transaction worker started");

    while (true) {
        try {
            const transaction = await claimNextTransaction();

            if (!transaction) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }

            console.log(
                `Processing transaction: ${transaction.transaction_id}`
            );

            await simulateExternalApiCall();

            await markTransactionProcessed(transaction.transaction_id);

            console.log(
                `Transaction processed: ${transaction.transaction_id}`
            );
        } catch (error) {
            console.error("Worker error:", error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

processTransactions();