const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const router = require("./src/routes/allRoutes");

// MongoDB connection URL
const mongoUrl = process.env.DBURL;

// Enable CORS for cross-origin requests
app.use(cors());

// Middleware for JSON request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(helmet());

// Middleware for request logging
app.use(morgan(":method :url :status"));

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
app.use(router);

// Connect to MongoDB
mongoose
  .connect(mongoUrl, {})
  .then(() => {
    console.log(
      "*********🛡️🔍 🏖️  Successfully Connected to MongoDB 🏖️ 🔍🛡️ **********"
    );
  })
  .catch((err) => {
    console.error("MongoDB Connection Failure", err);
  });

// Define the port to listen on
const port = process.env.PORT || 9090;

// Start the Express server
app.listen(port, () => {
  console.log(
    `🔥🔥🏖️  $$$$$$ Server is listening on port ${port} $$$$$$$ 🏖️ 🔥🔥`
  );
});
