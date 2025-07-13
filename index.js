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


app.use('/api/users', userRoutes);

app.use('/api/helpers', helperRoutes);



// Global Handlers
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1); // Optional: shutdown
});



const PORT = process.env.PORT || 5500;

server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
     logger.info(`Server running on port ${PORT}`);
})

