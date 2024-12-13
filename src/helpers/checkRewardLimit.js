// helpers/rewardsLimit.js

const User = require('../models/userModel')
const logger = require('../helpers/logger')

const TOTAL_REWARDS_LIMIT = 15000

const checkRewardsLimit = async (gamePoints) => {
  // Calculate total rewards across all users in the database
  const totalRewardsInDB = await User.aggregate([
    { $group: { _id: null, total: { $sum: '$totalRewards' } } }
  ])
  const totalRewardsSoFar = totalRewardsInDB[0]?.total || 0
  const remainingRewards = TOTAL_REWARDS_LIMIT - totalRewardsSoFar

  if (remainingRewards <= 0) {
    logger.warn(`Total rewards limit reached. No more rewards can be distributed.`)
    return { canAdd: false, remainingRewards: 0 }
  }

  // Ensure gamePoints is a number and calculate how much can be added
  const pointsToAdd = Math.min(Number(gamePoints) || 0, remainingRewards)
  if (pointsToAdd === 0) {
    logger.warn(`No rewards can be added. Remaining rewards limit is insufficient.`)
    return { canAdd: false, remainingRewards }
  }

  return { canAdd: true, pointsToAdd, remainingRewards }
}

module.exports = checkRewardsLimit
