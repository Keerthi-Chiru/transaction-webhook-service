import app from "./app.js";
import { pool } from "./db.js";


const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await pool.query("SELECT 1");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to the database:", error);
        process.exit(1);
    }
}

startServer();
