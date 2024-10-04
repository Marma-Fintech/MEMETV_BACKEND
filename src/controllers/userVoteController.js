const User = require('../models/userModel')
const Vote = require('../models/userVoteModel')
const logger = require('../helpers/logger')

const userChoosePoll = async (req, res, next) => {
  const { voteChoice, voteChoiceId, telegramId } = req.body

  try {
    // Find the user by their telegramId
    let user = await User.findOne({ telegramId })

    if (!user) {
      logger.error(`User with Telegram ID ${telegramId} not found`)
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if the vote record for the specific voteChoiceId exists
    let voteRecord = await Vote.findOne({ 'votes.voteChoiceId': voteChoiceId })

    if (voteRecord) {
      const voteChoiceEntry = voteRecord.votes.find(
        vote => vote.voteChoiceId === voteChoiceId
      )

      if (voteChoiceEntry) {
        const existingVoter = voteChoiceEntry.voters.find(
          voter => voter.telegramId === telegramId
        )

        if (existingVoter) {
          return res.status(400).json({
            message: 'You have already chosen.'
          })
        } else {
          // If the user hasn't voted yet, add them to the voters list
          voteChoiceEntry.voters.push({ telegramId, voteCount: 0 })
        }
      }
    } else {
      // Create a new vote record if not found
      voteRecord = new Vote({
        votes: [
          {
            voteChoice,
            voteChoiceId,
            voters: [{ telegramId, voteCount: 0 }]
          }
        ]
      })
    }

    await voteRecord.save()

    // Update nested voteDetails object using $set operator to ensure proper update
    await User.updateOne(
      { telegramId: telegramId },
      {
        $set: {
          'voteDetails.voteStatus': true,
          'voteDetails.voteDate': new Date()
        }
      }
    )

    logger.info(`VoteChoice recorded for user ${telegramId}: ${voteChoice}`)

    const responseVote = {
      telegramId,
      voteChoice,
      voteChoiceId
    }

    // Send success response
    return res.status(200).json({
      message: 'VoteChoice successfully recorded',
      vote: responseVote
    })
  } catch (err) {
    if (err.code === 11000) {
      logger.error('Duplicate key error:', err)
      return res.status(400).json({
        message: 'Invalid details. This vote choice already exists.'
      })
    }

    logger.error('Error in userChoosePoll controller', err)
    next(err)
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
      voteChoiceId: voteChoiceId
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
