const cluster = require('cluster');
const os = require('os');
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
const rateLimit = require('express-rate-limit');
if (cluster.isMaster) {
const token = process.env.TELEGRAM_TOKEN
const bot = new TelegramBot(token)

// Handle the /start command from Telegram
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

const numCPUs = os.cpus().length;

//Fork workers for each CPU core
for (let i = 0; i < numCPUs; i++) {
  cluster.fork();
}

const app = express()

// Connect to MongoDB
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

// Middleware setup
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(helmet())
app.use(morgan('combined'))

// Set up routes
const router = require('./src/routes/allRoutes')
app.use(router)

app.get('/', (req, res) => {
  res.send(' ***🔥🔥 TheMemeTv Backend Server is Running 🔥🔥*** ')
})

// Rate limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000 // Limit each IP to 1000 requests per window
});
app.use(limiter);

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

let isProcessing = false // A flag to indicate if the job is currently processing

const determineWinnersAndLosers = async () => {
  if (isProcessing) {
    logger.info(
      'The job is already running. Exiting to prevent duplicate execution.'
    )
    return // Exit if already processing
  }

  isProcessing = true // Set the flag to indicate that processing has started

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
      isProcessing = false // Reset the flag before exiting
      return
    }

    // Check if rewards have already been distributed today
    if (vote.rewardsDistributed) {
      logger.info('Rewards have already been distributed for today.')
      isProcessing = false // Reset the flag before exiting
      return // Exit if rewards were already distributed
    }

    // Calculate team votes and determine the winner and lose
    const teamVotes = vote.teams.map(team => ({
      teamId: team.teamId,
      teamVotes: team.votersIds.reduce(
        (total, voter) => total + (parseInt(voter.yourVotes) || 0),
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

    // Store processed users to avoid duplication
    const processedUsers = new Set()

    // Distribute battle rewards to the voters of the winning team only
    await Promise.all(
      winner.votersIds.map(async voter => {
        // Find the user by telegramId
        const user = await User.findOne({ telegramId: voter.telegramId })
        console.log(user)
        // Check if the user exists and hasn't been processed
        if (!user) {
          logger.error(`User not found for telegramId ${voter.telegramId}`)
          return // Exit if user not found
        }

        // Skip if already processed
        if (processedUsers.has(user.telegramId)) {
          return // Exit if already processed
        }

        // Mark user as processed
        processedUsers.add(user.telegramId)

        // Calculate the proportion of this user's votes out of the total team votes
        const userVoteProportion = parseInt(voter.yourVotes) / winner.teamVotes

        // Calculate the battle reward for the user based on their vote proportion
        let battleReward = battleRewards * userVoteProportion

        // Round the battle reward to the nearest integer
        battleReward = Math.round(battleReward)

        // Update the user's battleReward in voteDetails
        user.voteDetails.battleReward += battleReward

        // Update totalRewards
        user.totalRewards += battleReward

        // Get today's date for daily rewards
        const todayKey = new Date().toISOString().slice(0, 10) // Format the date as YYYY-MM-DD

        // Find existing daily reward for today
        const existingDailyReward = user.dailyRewards.find(
          reward => reward.createdAt.toISOString().slice(0, 10) === todayKey
        )

        if (existingDailyReward) {
          // If a daily reward exists for today, increment the totalRewards in that entry
          existingDailyReward.totalRewards += battleReward
        } else {
          // If no daily reward exists for today, create a new one
          user.dailyRewards.push({
            userId: user._id,
            telegramId: user.telegramId,
            totalRewards: battleReward, // Adding today's battle reward
            userStaking: false,
            createdAt: new Date() // Set createdAt to now
          })
        }

        // Save the updated user
        await user.save()

        // Log after successful update
        logger.info(
          `Updated rewards for user with telegramId ${
            voter.telegramId
          }: totalRewards=${user.totalRewards}, dailyRewards=${
            existingDailyReward
              ? existingDailyReward.totalRewards
              : battleReward
          }`
        )
      })
    )

    // Save the updated vote document
    vote.rewardsDistributed = true // Mark rewards as distributed
    await vote.save()

    logger.info(
      `Updated vote document ${vote._id} with winner ${vote.winner} and lose ${vote.lose}`
    )
  } catch (err) {
    logger.error(`Error calculating battle rewards: ${err.message}`)
  } finally {
    isProcessing = false // Reset the flag after processing is complete
  }
}

// Store a reference to the cron job
const scheduledJob = cron.schedule('10 16 * * *', () => {
  logger.info('Running cron job to determine winners and lose...')
  determineWinnersAndLosers()
})

// Stop the cron job after the end date
const stopCronJob = async () => {
  const currentDate = new Date()
  const endDate = new Date('2024-10-18T23:59:59Z')

  if (currentDate > endDate) {
    scheduledJob.stop() // Stop the specific cron job
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
