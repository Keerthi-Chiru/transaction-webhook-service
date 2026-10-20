import app from "./app.js";
import { pool } from "./db.js";



async function startServer() {
    try {
        await pool.query("SELECT 1");
        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    } catch (error) {
        console.error("Failed to connect to the database:", error);
        process.exit(1);
    }
}

startServer();
