import "dotenv/config";
import app from "./src/app.js";
import { connectToDB } from "./src/config/database.js";
import http from "http";
import { initSocket } from "./src/sockets/server.socket.js";

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

initSocket(httpServer);

// Start-up sequence: connect to MongoDB first, then let Express begin serving requests.
connectToDB()
    .then(() => {
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    });
