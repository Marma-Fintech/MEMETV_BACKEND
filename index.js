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
const Vote = require('./src/models/userVoteModel')
const User = require('./src/models/userModel')
const cron = require('node-cron') // Add cron for scheduling tasks
require('dotenv').config()
const http = require('http') // Add http server
const WebSocket = require('ws') // Add WebSocket
const rateLimit = require('express-rate-limit')

if (cluster.isMaster) {
  const token = process.env.TELEGRAM_TOKEN
  const bot = new TelegramBot(token,{polling: true})
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
                url: `https://hilarious-biscuit-35df15.netlify.app/?start=${referredId}`
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

  const determineWinnersAndLosers = async () => {
    const battleRewards = 1000 // Total battle rewards
    try {
      // Get today's date in UTC (start of the day)
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0) // Set to midnight UTC

      // Get end of the day in UTC
      const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)

      // Find the vote document for today's date only (strict check)
      const vote = await Vote.findOne({
        date: {
          $gte: today,
          $lte: endOfDay
        }
      })

      // If no battle is found for today, return an error
      if (!vote) {
        logger.warn('No battles available for today')
        return
      }

      // Calculate team votes and determine the winner and lose
      const teamVotes = vote.teams.map(team => ({
        teamId: team.teamId,
        teamVotes: team.votersIds.reduce(
          (total, voter) => total + parseInt(voter.yourVotes) || 0,
          0
        ),
        votersIds: team.votersIds
      }))

      const winner = teamVotes.reduce((prev, current) =>
        prev.teamVotes > current.teamVotes ? prev : current
      )

      const lose = teamVotes.reduce((prev, current) =>
        prev.teamVotes < current.teamVotes ? prev : current
      )

      // Update the winner and lose in the vote document
      vote.winner = winner.teamId
      vote.lose = lose.teamId
      await vote.save() // Save the updated document
      logger.info(
        `Updated vote document ${vote._id} with winner ${vote.winner} and loser ${vote.lose}`
      )

      // Distribute battle rewards to the voters of the winning team only
      for (const voter of winner.votersIds) {
        // Find the user by telegramId
        const user = await User.findOne({ telegramId: voter.telegramId })

        // Check if the user exists
        if (!user) {
          logger.error(`User not found for telegramId ${voter.telegramId}`)
          continue
        }

        // Calculate the proportion of this user's votes out of the total team votes
        const userVoteProportion = parseInt(voter.yourVotes) / winner.teamVotes

        // Calculate the battle reward for the user based on their vote proportion
        let battleReward = battleRewards * userVoteProportion

        // Round the battle reward to the nearest integer
        battleReward = Math.round(battleReward)

        // Update the user's rewards
        user.voteDetails.battleReward = battleReward

        // Save the updated user
        await user.save()

        logger.info(
          `Updated rewards for user with telegramId ${voter.telegramId}`
        )
      }
    } catch (err) {
      logger.error(`Error calculating battle rewards: ${err.message}`)
    }
  }

  // Schedule the cron job to run every day at 3:22 PM server time
  cron.schedule('26 16 * * *', () => {
    logger.info('Running cron job to determine winners and lose...')
    determineWinnersAndLosers()
  })

  // Stop the cron job after the end date
  const stopCronJob = async () => {
    const currentDate = new Date()
    const endDate = new Date('2024-10-15T23:59:59Z')

    if (currentDate > endDate) {
      cron.stop()
      logger.info('Cron job stopped as the end date has been reached.')
    }
  }

  // Call stopCronJob to check if it should stop (can be run on server startup)
  stopCronJob()

  // Listen on the specified port
  const port = process.env.PORT || 8888
  server.listen(port, () => {
    logger.info(
      `🏖️ 🔥  Worker ${process.pid} is listening on port ${port} 🏖️ 🔥 `
    )
  })
}
