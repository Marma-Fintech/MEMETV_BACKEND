const cluster = require('cluster')
const os = require('os')
const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const TelegramBot = require('node-telegram-bot-api')
const logger = require('./src/helpers/logger')
require('dotenv').config()

if (cluster.isMaster) {
  const numCPUs = os.cpus().length
  logger.info(`Master ${process.pid} is running`)

  // Fork workers for handling HTTP requests, not the bot
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died`)
    cluster.fork() // Fork a new worker when one dies
  })
} else {
  const app = express()

  // Initialize the bot only in the first worker
  if (process.env.BOT_INIT_WORKER_ID == cluster.worker.id) {
    const token = process.env.TELEGRAM_TOKEN
    const url = process.env.APP_URL

    const botInstance = new TelegramBot(token)
    
    // Set up webhook
    botInstance.setWebHook(`${url}/bot${token}`)

    // Handle the /start command
    botInstance.onText(/\/start(?:\s+(\w+))?/, (msg, match) => {
      console.log("hi");
      const chatId = msg.chat.id
      const referredId = match[1]
      logger.info(`Received /start command with referredId: ${referredId}`)

      botInstance.sendMessage(chatId, 'Welcome! Open the web app to see your details:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Open WebApp',
                web_app: {
                  url: `${url}/?start=${referredId}`
                }
              }
            ]
          ]
        }
      })
    })

    // Express route for handling webhook updates from Telegram
    app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
      botInstance.processUpdate(req.body)
      res.sendStatus(200)
    })
  }

  // MongoDB Connection
  mongoose
    .connect(process.env.DBURL, {
      maxPoolSize: 10, // Set maxPoolSize instead of poolSize
      serverSelectionTimeoutMS: 5000 // Keep trying to send operations for 5 seconds
    })
    .then(() => {
      logger.info(
        '*********🛡️🔍 🏖️  Successfully Connected to MongoDB 🏖️ 🔍🛡️ **********'
      )
    })
    .catch(err => {
      logger.error('MongoDB Connection Failure', err)
    })

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(helmet())
  app.use(morgan('combined'))

  const router = require('./src/routes/allRoutes')
  app.use(router)

  const rateLimit = require('express-rate-limit')
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000 // Limit each IP to 1000 requests per `window` (here, per minute)
  })
  app.use(limiter)

  const port = process.env.PORT || 9090
  app.listen(port, () => {
    logger.info(`Worker ${process.pid} is listening on port ${port}`)
  })
}
