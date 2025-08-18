require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const socket = require("./socket");
const cors = require("cors");
const db = require("./config/db");
const logger = require("./logger");



const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);

const io = socket.init(server);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const userRoutes = require('./routes/userRoutes');

const helperRoutes = require('./routes/helperRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const additionalRoutes = require('./routes/additionalRoutes');
const domainRoutes = require('./routes/domainRoutes');
const planRoutes = require('./routes/planRoutes');
const approveaddcallrequestRoutes = require('./routes/approveaddcallrequestRoutes');
const completedcallratingRoutes = require('./routes/completedcallratingRoutes');
const followerRoutes = require('./routes/followerRoutes');
const cronRoutes = require('./routes/cronRoutes');
const apiRoutes = require('./routes/apiRoutes');


app.use('/api/users', userRoutes);
app.use('/api/helpers', helperRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/additional', additionalRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/approveaddcallrequests', approveaddcallrequestRoutes);
app.use('/api/completedcallratings', completedcallratingRoutes);
app.use('/api/followers', followerRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/api', apiRoutes);



// Global Handlers
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1); // Optional: shutdown
});

// io.on("connection", (socket) => {
//     socket.on("user-connected", (userId) => {
//         onlineUsers.set(userId, socket.id);
//         io.emit("online-users", Array.from(onlineUsers.keys())); // broadcast online list
//     });


//     socket.on("disconnect", () => {
//         for (const [userId, sockId] of onlineUsers.entries()) {
//             if (sockId === socket.id) {
//                 onlineUsers.delete(userId);
//                 break;
//             }
//         }
//         //io.emit("online-users", Array.from(onlineUsers.keys())); // broadcast updated list
//     });
// });

const PORT = process.env.PORT || 5500;

server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
    //  logger.info(`Server running on port ${PORT}`);
})

