import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

if(!process.env.DATABASE_URL){
    throw new Error("DATABASE_URL is missing from .env");
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    min: 1,
    max: 5,
    connectionTimeoutMillis: 5000,
});

