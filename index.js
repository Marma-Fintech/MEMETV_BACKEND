const cluster = require('cluster');
const os = require('os');
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// Cluster Setup
//cluster module in Node.js allows you to create child processes (workers) that all share the same server
//It's particularly useful for taking advantage of multi-core systems by creating multiple worker processes 
//that can handle requests concurrently, rather than just one single-threaded process.
if (cluster.isMaster) {
  const numCPUs = os.cpus().length;

  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  // Express App Setup
  const app = express();

  // MongoDB Connection with maxPoolSize
  mongoose.connect(process.env.DBURL, {
    maxPoolSize: 10, // Set maxPoolSize instead of poolSize
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  }).then(() => {
    console.log(
      "*********🛡️🔍 🏖️  Successfully Connected to MongoDB 🏖️ 🔍🛡️ **********"
    );
  }).catch(err => {
    console.error("MongoDB Connection Failure", err);
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(helmet());
  app.use(morgan("combined"));

  // Initialize Telegram Bot
  const token = process.env.TELEGRAM_TOKEN;
  const bot = new TelegramBot(token);

  // Handle '/start' command
  bot.onText(/\/start(?:\s+(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const referredId = match[1];
    console.log(referredId + JSON.stringify(match) + " rrrrrrrrr");
    bot.sendMessage(chatId, "Welcome! Open the web app to see your details:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open WebApp",
              web_app: {
                url: `https://hilarious-biscuit-35df15.netlify.app/?start=${referredId}`,
              },
            },
          ],
        ],
      },
    });
  });

  // Use your routes
  const router = require("./src/routes/allRoutes");
  app.use(router);

// Rate Limiting (Example with express-rate-limit)
//express-rate-limit: Middleware for limiting the rate of incoming requests to protect your application 
//from abuse and improve overall security
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000 // Limit each IP to 1000 requests per `window` (here, per minute)
  });
  app.use(limiter);

  // Start the Server
  const port = process.env.PORT || 9090;
  app.listen(port, () => {
    console.log(`Worker ${process.pid} is listening on port ${port}`);
  });
}
