const cluster = require('cluster')
const os = require('os')
const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const TelegramBot = require('node-telegram-bot-api')
const logger = require('./src/helpers/logger') // Import the custom logger
require('dotenv').config()
const http = require('http') // Add http server
const WebSocket = require('ws') // Add WebSocket
const rateLimit = require('express-rate-limit')

if (cluster.isMaster) {
  const token = process.env.TELEGRAM_TOKEN
  const bot = new TelegramBot(token, { polling: true })
  bot.onText(/\/start(?:\s+(\w+))?/, (msg, match) => {
    const chatId = msg.chat.id
    const referredId = match[1]
    logger.info(`Received /start command with referredId: ${referredId}`)
    bot.sendMessage(chatId, 'Welcome! Open the web app to see your details:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Open WebApp',
              web_app: {
                url: `https://app.thememe.tv/?start=${referredId}`
              }
            }
          ]
        ]
      }
    })
  })

  const numCPUs = os.cpus().length

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died`)
  })
} else {
  const app = express()

  mongoose
    .connect(process.env.DBURL, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    })
    .then(() => {
      logger.info(
        '*********🛡️ 🔍  Successfully Connected to MongoDB 🛡️ 🔍 **********'
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

  app.get('/', (req, res) => {
    res.send(' ***🔥🔥 TheMemeTv Backend Server is Running 🔥🔥*** ')
  })

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000 // Limit each IP to 1000 requests per `window`
  })
  app.use(limiter)

  // Create HTTP server to handle both HTTP and WebSocket traffic
  const server = http.createServer(app)

  // WebSocket setup
  const wsPort = process.env.WS_PORT || 3000
  const wsServer = new WebSocket.Server({ server })

  let activeUsers = 0

  wsServer.on('connection', ws => {
    activeUsers++
    broadcastActiveUsers()

    ws.on('close', () => {
      activeUsers--
      broadcastActiveUsers()
    })
  })

  function broadcastActiveUsers () {
    wsServer.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ activeUsers }))
      }
    })
  }

  // Log WebSocket server status
  logger.info(`WebSocket server is running on port ${wsPort}`)

  // Listen on the specified port
  const port = process.env.PORT || 8888
  server.listen(port, () => {
    logger.info(
      `🏖️ 🔥  Worker ${process.pid} is listening on port ${port} 🏖️ 🔥 `
    )
  })
}
