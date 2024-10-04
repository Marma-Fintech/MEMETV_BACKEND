const User = require('../models/userModel')
const Vote = require('../models/userVoteModel')
const logger = require('../helpers/logger')

const userChoosePoll = async (req, res, next) => {
  const { voteChoice, voteChoiceId, telegramId } = req.body // Get voteChoice and telegramId from request body

  try {
    // Find the user by their telegramId
    const user = await User.findOne({ telegramId })

    if (!user) {
      logger.error(`User with Telegram ID ${telegramId} not found`)
      return res.status(404).json({ message: 'User not found' })
    }

    // Find the vote record for the specific voteChoiceId
    let voteRecord = await Vote.findOne({ 'votes.voteChoiceId': voteChoiceId })

    if (voteRecord) {
      // Find the specific vote entry for the voteChoiceId
      const voteChoiceEntry = voteRecord.votes.find(
        vote => vote.voteChoiceId === voteChoiceId
      )

      if (voteChoiceEntry) {
        // Check if the user has already voted for this choice
        const existingVoter = voteChoiceEntry.voters.find(
          voter => voter.telegramId === telegramId
        )

        if (existingVoter) {
          // If the user has already voted for this voteChoiceId, respond with a message
          return res.status(400).json({
            message: 'You have already choosen.'
          })
        } else {
          // If the user hasn't voted yet, add the user to the voters list
          voteChoiceEntry.voters.push({ telegramId, voteCount: 0 }) // Add new voter with voteCount of 0
        }
      }
    } else {
      // Create a new vote entry if none exists for this voteChoiceId
      voteRecord = new Vote({
        votes: [
          {
            voteChoice,
            voteChoiceId,
            voters: [{ telegramId, voteCount: 0 }] // Initialize with the first vote
          }
        ]
      })
    }

    await voteRecord.save() // Save the vote record

    logger.info(`VoteChoice recorded for user ${telegramId}: ${voteChoice}`)

    // Prepare response with telegramId and voteChoice
    const responseVote = {
      telegramId: telegramId, // Include telegramId in the response
      voteChoice: voteChoice, // Include the chosen vote
      voteChoiceId: voteChoiceId
    }

    // Send success response
    return res.status(200).json({
      message: 'VoteChoice successfully recorded',
      vote: responseVote // Return the response vote
    })
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error handling
      logger.error('Duplicate key error:', err)
      return res.status(400).json({
        message: 'Invalid details. This vote choice already exists.'
      })
    }

    logger.error('Error in userChoosePoll controller', err)
    next(err) // Pass error to the global error handler
  }
}

const calculateVotes = async (req, res, next) => {
  const { voteChoiceId, telegramId, voteCount } = req.body // Get voteChoiceId, telegramId, and voteCount from request body

  try {
    // Find the vote record for the specific voteChoiceId
    const voteRecord = await Vote.findOne({
      'votes.voteChoiceId': voteChoiceId
    })

    if (!voteRecord) {
      logger.error(`Vote record with voteChoiceId ${voteChoiceId} not found`)
      return res.status(404).json({ message: 'Vote record not found' })
    }

    // Find the specific vote entry for the voteChoiceId
    const voteChoiceEntry = voteRecord.votes.find(
      vote => vote.voteChoiceId === voteChoiceId
    )

    if (!voteChoiceEntry) {
      logger.error(
        `Vote choice entry for voteChoiceId ${voteChoiceId} not found`
      )
      return res.status(404).json({ message: 'Vote choice not found' })
    }

    // Check if the telegramId is in the voters array
    const voter = voteChoiceEntry.voters.find(
      voter => voter.telegramId === telegramId
    )

    if (!voter) {
      logger.error(`Invalid telegramId: ${telegramId}`)
      return res.status(400).json({ message: 'Invalid telegramId' })
    }

    // Update the voteCount for the voter
    voter.voteCount += voteCount // Update the voteCount based on the input
    await voteRecord.save() // Save the updated voteRecord

    // Respond with the updated information
    return res.status(200).json({
      telegramId: voter.telegramId,
      voteCount: voter.voteCount, // Return the updated voteCount
      voteChoiceId: voteChoiceId,
    })
  } catch (err) {
    logger.error('Error in calculateVotes controller', err)
    next(err) // Pass error to the global error handler
  }
}

module.exports = {
  userChoosePoll,
  calculateVotes
}
