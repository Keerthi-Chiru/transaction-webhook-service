import { pool } from "./db.js";

export async function createTransaction(transaction) {

    const result  = await pool.query(
        `INSERT INTO transactions
        (transaction_id, source_account, destination_account, amount, currency)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (transaction_id) DO NOTHING
        RETURNING *`,

        [
            transaction.transaction_id,
            transaction.source_account,
            transaction.destination_account,
            transaction.amount,
            transaction.currency
        ]
   
);

    if(result.rows.length ===0){
        return {
            created: false,
            transaction: null
        };
    }

    return {
        created: true,
        transaction: result.rows[0]
    };
}



export async function getTransactionById(transactionId) {
    const result = await pool.query(
        `SELECT *
         FROM transactions
         WHERE transaction_id = $1`,
        [transactionId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}


export async function claimNextTransaction() {
    const result = await pool.query(`
        WITH next_transaction AS (
            SELECT transaction_id
            FROM transactions
            WHERE status = 'PROCESSING'
              AND (
                  processing_started_at IS NULL
                  OR processing_started_at < NOW() - INTERVAL '2 minutes'
              )
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        UPDATE transactions AS t
        SET processing_started_at = NOW()
        FROM next_transaction AS nt
        WHERE t.transaction_id = nt.transaction_id
        RETURNING t.*;
    `);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}
