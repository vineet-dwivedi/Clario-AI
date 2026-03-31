import { Server } from "socket.io";

let io;
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
].filter(Boolean);

export function initSocket(httpServer){
    io = new Server(httpServer,{
        cors:{
            origin(origin, callback) {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
            },
            credentials: true,
        }
    })

    console.log("Socket.io server is running")

    io.on("connection",(socket)=>{
        console.log("A user connected: " + socket.id)
    })
}

export function getIO(){
    if(!io){
        throw new Error("Socket.io not initialized")
    }
    return io
}
