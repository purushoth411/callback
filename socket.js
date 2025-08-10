// socket.js
const { Server } = require("socket.io");

let io;
const connectedUsers = {}; // userId -> socketId

module.exports = {
    init: (server) => {
        io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        io.on("connection", (socket) => {
            console.log("A user connected:", socket.id);

            // Register userId to socketId mapping
            socket.on("registerUser", (userId) => {
                connectedUsers[userId] = socket.id;
                console.log(`User registered: ${userId} -> ${socket.id}`);
            });

            // Cleanup on disconnect
            socket.on("disconnect", () => {
                for (let [userId, id] of Object.entries(connectedUsers)) {
                    if (id === socket.id) {
                        delete connectedUsers[userId];
                        console.log(`User disconnected: ${userId}`);
                        break;
                    }
                }
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) throw new Error("Socket.io not initialized");
        return io;
    },
    getConnectedUsers: () => connectedUsers
};
