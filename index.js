const cluster = require("cluster");
const os = require("os");
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const TelegramBot = require("node-telegram-bot-api");
const logger = require("./src/helpers/logger"); // Import the custom logger
require("dotenv").config();


if (cluster.isMaster) {
  const token = process.env.TELEGRAM_TOKEN;
  const bot = new TelegramBot(token);
  bot.onText(/\/start(?:\s+(\w+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const referredId = match[1];
    logger.info(`Received /start command with referredId: ${referredId}`);
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

const numCPUs = os.cpus().length;
logger.info(`Master ${process.pid} is running`);
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died`);
  });
} else {
  const app = express();

  mongoose
    .connect(process.env.DBURL, {
      maxPoolSize: 10, // Set maxPoolSize instead of poolSize
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    })
    .then(() => {
      logger.info("********* Successfully Connected to MongoDB **********");
    })
    .catch((err) => {
      logger.error("MongoDB Connection Failure", err);
    });

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(helmet());
  app.use(morgan("combined"));
  const router = require("./src/routes/allRoutes");
  app.use(router);

  const rateLimit = require("express-rate-limit");
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per minute)
  });
  app.use(limiter);
  const port = process.env.PORT || 9090;
  app.listen(port, () => {
    logger.info(`Worker ${process.pid} is listening on port ${port}`);
  });
}
