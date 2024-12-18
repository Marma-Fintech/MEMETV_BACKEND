const User = require('../models/userModel')
const logger = require('../helpers/logger')
const TOTALREWARDS_LIMIT = 21000000000


// Function to generate a 5-character alphanumeric identifier
const generateRefId = () => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }
  return result
}

const levelUpBonuses = [
  1000, // Level 2 to Level 3
  10000, // Level 3 to Level 4
  50000, // Level 4 to Level 5
  100000, // Level 5 to Level 6
  500000, // Level 6 to Level 7
  1000000, // Level 7 to Level 8
  5000000, // Level 8 to Level 9
  10000000, // Level 9 to Level 10
  20000000 // Level 10 and above
]

const thresholds = [
  { limit: 500, level: 1 },
  { limit: 10000, level: 2 },
  { limit: 50000, level: 3 },
  { limit: 200000, level: 4 },
  { limit: 800000, level: 5 },
  { limit: 3000000, level: 6 },
  { limit: 10000000, level: 7 },
  { limit: 25000000, level: 8 },
  { limit: 50000000, level: 9 },
  { limit: 80000000, level: 10 }
]


const updateLevel = (user, currentDateString) => {
  const currentDate = new Date(currentDateString);
  const currentLevel = user.level || 1;
  let newLevel = currentLevel;
  let newLevelUpPoints = 0;

  // Determine the new level based on totalRewards
  for (const threshold of thresholds) {
    if (user.totalRewards >= threshold.limit) {
      newLevel = threshold.level;
    } else {
      break;
    }
  }

  // Calculate level-up rewards if the level increased
  if (newLevel > currentLevel) {
    for (let i = currentLevel; i < newLevel; i++) {
      newLevelUpPoints += levelUpBonuses[i - 1]; // Sum bonuses for level increases
    }
  }

  // Calculate space available in totalRewards
  const availableSpace = TOTALREWARDS_LIMIT - user.totalRewards;

  // Only add level-up rewards that fit within the limit
  const actualLevelUpPoints = Math.min(newLevelUpPoints, availableSpace);

  // Update user's level, levelUpRewards, and totalRewards
  if (actualLevelUpPoints > 0) {
    user.levelUpRewards = (user.levelUpRewards || 0) + actualLevelUpPoints;
    user.totalRewards += actualLevelUpPoints;
  }

  // Update the level if it has increased
  if (newLevel > currentLevel) {
    user.level = newLevel;
  }

  // Update the dailyRewards array
  const today = new Date(currentDateString);
  today.setUTCHours(0, 0, 0, 0);

  let dailyReward = user.dailyRewards.find(dr => {
    const rewardDate = new Date(dr.createdAt);
    rewardDate.setUTCHours(0, 0, 0, 0);
    return rewardDate.getTime() === today.getTime();
  });

  if (dailyReward) {
    dailyReward.totalRewards += actualLevelUpPoints;
  } else {
    user.dailyRewards.push({
      userId: user._id,
      telegramId: user.telegramId,
      totalRewards: actualLevelUpPoints,
      userStaking: false,
      createdAt: today
    });
  }
};

const startDate = new Date('2024-12-03') // Project start date

const calculatePhase = (currentDate, startDate) => {
  const oneDay = 24 * 60 * 60 * 1000
  const daysDifference = Math.floor((currentDate - startDate) / oneDay)
  const phase = Math.floor(daysDifference / 7) + 1
  return Math.min(phase)
}

const login = async (req, res, next) => {
  let { name, referredById, telegramId } = req.body

  try {
    name = name.trim()
    telegramId = telegramId.trim()
    const refId = generateRefId() // Implement this function to generate a refId
    let user = await User.findOne({ telegramId })
    const currentDate = new Date()
    const currentDay = currentDate.getUTCDate()
    const currentMonth = currentDate.getUTCMonth()
    const currentYear = currentDate.getUTCFullYear()

    // Calculate the current phase
    const currentPhase = calculatePhase(currentDate, startDate)

    // Logic for updating voteStatus and voteDate
    if (user && user.voteDetails) {
      const lastVoteDate = new Date(user.voteDetails.voteDate)

      // If more than 1 day has passed since last voteDate
      if (
        currentYear > lastVoteDate.getUTCFullYear() ||
        currentMonth > lastVoteDate.getUTCMonth() ||
        currentDay > lastVoteDate.getUTCDate()
      ) {
        // Update voteStatus to false and voteDate to the current date
        user.voteDetails.voteStatus = false
        user.voteDetails.voteDate = currentDate
        user.voteDetails.votingTeamId = ''
        user.voteDetails.votesCount = 0
      }
    }

    let referringUser = null
    if (referredById) {
      referringUser = await User.findOne({ refId: referredById })
      if (!referringUser) {
        referredById = '' // Set to null if referring user not found
        console.error('Referring user not found')
      }
    }

    if (!user) {
      // New user registration logic
      user = new User({
        name,
        telegramId,
        refId,
        referredById,
        boosters: ['levelUp'],
        totalRewards: 500,
        referRewards: 0,
        lastLogin: currentDate,
        level: 1,
        levelUpRewards: 500,
        voteDetails: {
          voteStatus: false,
          voteDate: currentDate
        }
      })

      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: 500,
        createdAt: currentDate
      })
      await user.save()

      // Handle referral logic for referringUser if applicable
      if (referringUser) {
        referringUser.yourReferenceIds.push({ userId: user._id })

        // Calculate total referring rewards while considering the limit
        const totalReferringRewards = referringUser.totalRewards + 100
        if (totalReferringRewards <= TOTALREWARDS_LIMIT) {
          referringUser.totalRewards += 100
          referringUser.referRewards += 100
        } else {
          referringUser.totalRewards = TOTALREWARDS_LIMIT
          referringUser.referRewards = TOTALREWARDS_LIMIT
        }

        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        let dailyReward = referringUser.dailyRewards.find(dr => {
          const rewardDate = new Date(dr.createdAt)
          rewardDate.setUTCHours(0, 0, 0, 0)
          return rewardDate.getTime() === today.getTime()
        })

        if (dailyReward) {
          dailyReward.totalRewards += 100
        } else {
          referringUser.dailyRewards.push({
            userId: referringUser._id,
            telegramId: referringUser.telegramId,
            totalRewards: 100,
            createdAt: currentDate
          })
        }

        // Handle milestone rewards for referringUser
        const numberOfReferrals = referringUser.yourReferenceIds.length
        const milestones = [
          { referrals: 3, reward: 20 },
          { referrals: 5, reward: 33333 },
          { referrals: 10, reward: 66667 },
          { referrals: 15, reward: 100000 },
          { referrals: 20, reward: 133333 },
          { referrals: 25, reward: 166667 },
          { referrals: 30, reward: 200000 },
          { referrals: 35, reward: 233333 },
          { referrals: 40, reward: 266667 },
          { referrals: 45, reward: 300000 },
          { referrals: 50, reward: 333333 },
          { referrals: 55, reward: 366667 },
          { referrals: 60, reward: 400000 },
          { referrals: 65, reward: 433333 },
          { referrals: 70, reward: 466667 },
          { referrals: 75, reward: 500000 },
          { referrals: 80, reward: 533333 },
          { referrals: 85, reward: 566667 },
          { referrals: 90, reward: 600000 },
          { referrals: 95, reward: 633333 },
          { referrals: 100, reward: 666667 }
        ]

        let milestoneReward = 0

        for (const milestone of milestones) {
          if (numberOfReferrals === milestone.referrals) {
            milestoneReward += milestone.reward
          }
        }

        // Capping milestone rewards within TOTALREWARDS_LIMIT
        const totalMilestoneRewards = referringUser.totalRewards + milestoneReward
        if (totalMilestoneRewards <= TOTALREWARDS_LIMIT) {
          referringUser.totalRewards += milestoneReward
          referringUser.referRewards += milestoneReward
        } else {
          const remainingSpace = TOTALREWARDS_LIMIT - referringUser.totalRewards
          referringUser.totalRewards += remainingSpace
          referringUser.referRewards += remainingSpace
        }

        if (dailyReward) {
          dailyReward.totalRewards += milestoneReward
        } else {
          referringUser.dailyRewards.push({
            userId: referringUser._id,
            telegramId: referringUser.telegramId,
            totalRewards: milestoneReward,
            createdAt: currentDate
          })
        }

        referringUser.boosters.push('2x', '2x', '2x', '2x', '2x')
        updateLevel(referringUser, currentDate.toISOString().split('T')[0])
        await referringUser.save()
      }
    } else {
      // Existing user login logic
      const lastLoginDate = new Date(user.lastLogin)
      const lastLoginDay = lastLoginDate.getUTCDate()
      const lastLoginMonth = lastLoginDate.getUTCMonth()
      const lastLoginYear = lastLoginDate.getUTCFullYear()

      if (
        currentYear > lastLoginYear ||
        currentMonth > lastLoginMonth ||
        currentDay > lastLoginDay
      ) {
        user.boosters.push('levelUp')
      }
      
      // Capping levelUpRewards within TOTALREWARDS_LIMIT
      if (user.levelUpRewards <= TOTALREWARDS_LIMIT - user.totalRewards) {
        user.totalRewards += user.levelUpRewards
      } else {
        user.totalRewards = TOTALREWARDS_LIMIT
      }

      user.lastLogin = currentDate
      await user.save()
    }

    // Update user level based on current data
    updateLevel(user, currentDate.toISOString().split('T')[0])

    // Calculate the total rewards across all users
    const totalRewardsInSystem = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$totalRewards' } } }
    ])

    const totalRewardsUsed = totalRewardsInSystem[0]
      ? totalRewardsInSystem[0].total
      : 0
    const availableSpace = TOTALREWARDS_LIMIT - totalRewardsUsed

    if (availableSpace <= 0) {
      logger.warn(
        `The total rewards limit of ${TOTALREWARDS_LIMIT} has been reached.`
      )
      return res.status(403).json({
        message: `Total rewards limit of ${TOTALREWARDS_LIMIT} exceeded across all users.`
      })
    }

    res.status(201).json({
      message: `User logged in successfully`,
      user,
      currentPhase, // Include the currentPhase in the response
      totalRewardsUsed, // Add total rewards used across the system
      availableSpace // Show the available rewards space
    })
  } catch (err) {
    logger.error(
      `Error processing login for user with telegramId: ${req.body.telegramId} - ${err.message}`
    )
    next(err)
  }
}



const userDetails = async (req, res, next) => {
  try {
    let { telegramId } = req.params

    // Trim leading and trailing spaces
    telegramId = telegramId.trim()

    logger.info(
      `Received request for user details with telegramId: ${telegramId}`
    )

    // Find the user detail document for the given telegramId
    const userDetail = await User.findOne({ telegramId: telegramId })

    // Check if user detail was found
    if (!userDetail) {
      logger.warn(`User not found for telegramId: ${telegramId}`)
      return res.status(404).json({ message: 'User not found' })
    }

    logger.info(
      `User details retrieved successfully for telegramId: ${telegramId}`
    )

    // Calculate the current phase
    const currentDate = new Date()
    const currentPhase = calculatePhase(currentDate, startDate)

    // Add the currentPhase to the user details
    const response = {
      ...userDetail._doc, // Spread the user detail fields
      currentPhase: currentPhase // Add the calculated phase
    }

    // Return the user details with the current phase in the response
    return res.status(200).json(response)
  } catch (err) {
    logger.error(`Error during login process: ${err.message}`)
    next(err)
  }
}


const userGameRewards = async (req, res, next) => {
  try {
    const { telegramId, boosters, gamePoints } = req.body;

    // Get the current date and time
    const now = new Date();

    logger.info(`Received request to add game rewards for user with telegramId: ${telegramId}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      logger.warn(`User not found for telegramId: ${telegramId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate the available space for totalRewards across all users
    const totalRewardsInSystem = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$totalRewards" } } }
    ]);

    const totalRewardsUsed = totalRewardsInSystem[0] ? totalRewardsInSystem[0].total : 0;

    const availableSpace = TOTALREWARDS_LIMIT - totalRewardsUsed;

    if (availableSpace <= 0) {
      logger.warn(`The total rewards limit of ${TOTALREWARDS_LIMIT} has been reached.`);
      return res.status(403).json({
        message: `Total rewards limit of ${TOTALREWARDS_LIMIT} exceeded across all users.`,
      });
    }

    // Game points to add
    const pointsToAdd = Number(gamePoints) || 0;

    // Calculate how many points we can add without exceeding the available space
    const spaceRemaining = Math.min(pointsToAdd, availableSpace); // Add only up to available space

    // Update game rewards
    user.gameRewards.gamePoints += spaceRemaining;

    // Calculate the total rewards to update
    let totalRewardsToAdd = spaceRemaining;

    // Now let's handle levelUpRewards in the same way
    const currentTotalRewards = user.totalRewards + totalRewardsToAdd;
    const remainingSpaceForLevelUp = TOTALREWARDS_LIMIT - currentTotalRewards;

    // Add levelUpRewards only if it fits within the remaining total rewards space
    let levelUpBonusToAdd = 0;

    if (remainingSpaceForLevelUp > 0) {
      levelUpBonusToAdd = Math.min(remainingSpaceForLevelUp); // Level-up reward max we respect the remaining space
    }

    // Update levelUpRewards
    if (levelUpBonusToAdd > 0) {
      user.levelUpRewards += levelUpBonusToAdd;
      totalRewardsToAdd += levelUpBonusToAdd; // Add level-up reward to total rewards
    }

    // Update totalRewards without exceeding the limit
    user.totalRewards += totalRewardsToAdd;
    user.totalRewards = Math.min(user.totalRewards, TOTALREWARDS_LIMIT);

    // Update the dailyRewards array for today
    const currentDateString = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const today = new Date(currentDateString);

    let dailyReward = user.dailyRewards.find(dr => {
      const rewardDate = new Date(dr.createdAt);
      rewardDate.setUTCHours(0, 0, 0, 0);
      return rewardDate.getTime() === today.getTime();
    });

    if (dailyReward) {
      // If there's an existing entry for today, just update the totalRewards
      dailyReward.totalRewards += totalRewardsToAdd;
      dailyReward.updatedAt = now;
      logger.info(`Updated daily reward entry for user with telegramId: ${telegramId}`);
    } else {
      // If there's no entry for today, create a new one
      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: totalRewardsToAdd, // Only the available rewards for today
        userStaking: false,
        createdAt: now,
      });
      logger.info(`Created new daily reward entry for user with telegramId: ${telegramId}`);
    }

    // Add boosters if available
    if (boosters && boosters.length > 0) {
      user.boosters.push(...boosters);
      logger.info(`Boosters added for user with telegramId: ${telegramId}`);
    }

    // Update the user's level based on the new totalRewards
    updateLevel(user, currentDateString);

    // Save the updated user document
    await user.save();

    logger.info(`Successfully added boosters and gamePoints for user with telegramId: ${telegramId}`);

    return res
      .status(200)
      .json({ message: 'Boosters, gamePoints, and level updated successfully', user });
  } catch (err) {
    logger.error(
      `Error processing game rewards for user with telegramId: ${telegramId} - ${err.message}`
    );
    next(err);
  }
};

const userTaskRewards = async (req, res, next) => {
  try {
    const { telegramId, taskPoints, channel } = req.body; // Destructure request body

    logger.info(
      `Received request to add task rewards for user with telegramId: ${telegramId}`
    );

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      logger.warn(`User not found for telegramId: ${telegramId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date(); // Get current date and time
    const currentDateString = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Ensure taskPoints is a Number
    const pointsToAdd = Number(taskPoints) || 0;

    // Check if the system date is earlier than the last dailyRewards date
    const lastDailyReward = user.dailyRewards[user.dailyRewards.length - 1];
    if (lastDailyReward) {
      const lastRewardDateString = new Date(lastDailyReward.createdAt)
        .toISOString()
        .split('T')[0];
      if (currentDateString < lastRewardDateString) {
        logger.warn(
          `Attempt to add rewards on a previous date. Current date: ${currentDateString}, Last daily rewards date: ${lastRewardDateString}`
        );
        return res.status(400).json({
          message: 'Cannot add rewards for a previous date.'
        });
      }
    }

    // Validate the channel and check if rewards were already claimed
    if (channel && user.taskRewards.hasOwnProperty(channel)) {
      if (user.taskRewards[channel]) {
        logger.warn(
          `Rewards for ${channel} have already been claimed by user with telegramId: ${telegramId}`
        );
        return res.status(400).json({
          message: `Rewards for ${channel} have already been claimed.`
        });
      }
    } else {
      logger.warn(`Invalid channel: ${channel}`);
      return res.status(400).json({ message: 'Invalid channel provided.' });
    }

    // Calculate available space for totalRewards
    const totalRewardsInSystem = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$totalRewards" } } }
    ]);

    const totalRewardsUsed = totalRewardsInSystem[0] ? totalRewardsInSystem[0].total : 0;
    const availableSpace = TOTALREWARDS_LIMIT - totalRewardsUsed;

    if (availableSpace <= 0) {
      logger.warn(`The total rewards limit of ${TOTALREWARDS_LIMIT} has been reached.`);
      return res.status(403).json({
        message: `Total rewards limit of ${TOTALREWARDS_LIMIT} exceeded across all users.`
      });
    }

    // Ensure taskPoints do not exceed available space
    const spaceRemaining = Math.min(pointsToAdd, availableSpace);

    // Add taskPoints to totalRewards and taskRewards
    if (spaceRemaining > 0) {
      user.totalRewards += spaceRemaining;
      user.taskRewards.taskPoints += spaceRemaining;
      user.taskRewards[channel] = true; // Mark the channel as true
      logger.info(
        `Updated ${channel} to true and added ${spaceRemaining} task points for user with telegramId: ${telegramId}`
      );
    }

    // Handle levelUpRewards if applicable
    const currentTotalRewards = user.totalRewards;
    const remainingSpaceForLevelUp = TOTALREWARDS_LIMIT - currentTotalRewards;
    let levelUpBonusToAdd = 0;

    if (remainingSpaceForLevelUp > 0) {
      levelUpBonusToAdd = Math.min(remainingSpaceForLevelUp); // Max level-up reward 
      user.levelUpRewards += levelUpBonusToAdd;
      user.totalRewards += levelUpBonusToAdd; // Update totalRewards with level-up bonus
    }

    // Update the dailyRewards array for today
    let dailyReward = user.dailyRewards.find(
      dr => new Date(dr.createdAt).toISOString().split('T')[0] === currentDateString
    );

    if (!dailyReward) {
      // Create a new dailyReward entry for today
      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: spaceRemaining + levelUpBonusToAdd, // Total rewards added today
        userStaking: false,
        createdAt: now
      });
      logger.info(
        `Created new daily reward entry for user with telegramId: ${telegramId}`
      );
    } else {
      // Update the existing entry for today
      dailyReward.totalRewards += spaceRemaining + levelUpBonusToAdd;
      dailyReward.updatedAt = now;
      logger.info(
        `Updated daily reward entry for user with telegramId: ${telegramId}`
      );
    }

    // Update the user's level based on the new totalRewards
    updateLevel(user, currentDateString);

    // Save the updated user document
    await user.save();

    logger.info(
      `Successfully added taskPoints and updated channel for user with telegramId: ${telegramId}`
    );

    return res
      .status(200)
      .json({ message: 'TaskPoints added successfully', user });
  } catch (err) {
    logger.error(
      `Error processing task rewards for user with telegramId: ${req.body.telegramId} - ${err.message}`
    );
    next(err);
  }
};

const purchaseGameCards = async (req, res, next) => {
  try {
    const { telegramId, gamePoints } = req.body

    // Get the current date and time
    const now = new Date()
    const today = now.toISOString().split('T')[0] // Get today's date in YYYY-MM-DD format

    logger.info(
      `Received request to purchase game cards for user with telegramId: ${telegramId}`
    )

    // Find the user by telegramId
    const user = await User.findOne({ telegramId })

    if (!user) {
      logger.warn(`User not found for telegramId: ${telegramId}`)
      return res.status(404).json({ message: 'User not found' })
    }

    // Ensure gamePoints is a number
    const pointsToDeduct = Number(gamePoints) || 0

    // Check if the user has enough points in totalRewards
    if (user.totalRewards >= pointsToDeduct) {
      // Deduct points from totalRewards
      user.totalRewards -= pointsToDeduct

      // Subtract points from spendingRewards
      user.spendingRewards = (user.spendingRewards || 0) - pointsToDeduct

      // Find today's entry in the dailyRewards array
      const todayRewardIndex = user.dailyRewards.findIndex(
        reward =>
          new Date(reward.createdAt).toISOString().split('T')[0] === today
      )

      let remainingPointsToDeduct = pointsToDeduct

      if (todayRewardIndex >= 0) {
        // Get the total rewards for today
        const todayRewards = user.dailyRewards[todayRewardIndex].totalRewards

        if (todayRewards >= remainingPointsToDeduct) {
          // Deduct from today's totalRewards
          user.dailyRewards[todayRewardIndex].totalRewards -=
            remainingPointsToDeduct
          remainingPointsToDeduct = 0 // All points deducted
        } else {
          // Set today's totalRewards to 0 and deduct the remaining from overall
          remainingPointsToDeduct -= todayRewards
          user.dailyRewards[todayRewardIndex].totalRewards = 0
        }

        logger.info(
          `Successfully deducted points from today's totalRewards in dailyRewards for user with telegramId: ${telegramId}`
        )
      } else {
        // If no entry for today, create one with totalRewards as 0 since all points go to spending
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: 0, // Points already deducted from overall rewards
          userStaking: false,
          createdAt: now
        })

        logger.info(
          `No dailyRewards entry for today, created new entry with 0 rewards for user with telegramId: ${telegramId}`
        )
      }

      // Save the updated user document
      await user.save()

      return res
        .status(200)
        .json({ message: 'Game cards purchased successfully', user })
    } else {
      logger.warn(
        `User with telegramId: ${telegramId} does not have enough points. Purchase failed.`
      )
      return res.status(400).json({ message: 'Not enough points available' })
    }
  } catch (err) {
    logger.error(
      `Error processing purchase for user with telegramId: ${telegramId} - ${err.message}`
    )
    next(err)
  }
}

const weekRewards = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Log the incoming request
    logger.info(
      `Received request to calculate weekly rewards for telegramId: ${telegramId}`
    );

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Find user by telegramId
    const userDetail = await User.findOne({ telegramId: telegramId });

    // Check if user exists
    if (!userDetail) {
      logger.warn(`User not found for telegramId: ${telegramId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(
      `User found for telegramId: ${telegramId}, calculating weekly rewards...`
    );

    // Define the start date (e.g., '2024-12-03')
    const startDate = new Date('2024-12-03');
    const lastLogin = new Date(userDetail.lastLogin); // User's last login date

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Initialize object to hold weekly rewards
    const weeklyRewards = {};

    // Helper function to get rewards for a specific week
    const getRewardsForWeek = (weekStartDate, weekEndDate) => {
      const weekRewards = userDetail.dailyRewards.filter((reward) => {
        const rewardDate = new Date(reward.createdAt);

        // Normalize dates to strip time part
        const normalizedRewardDate = rewardDate.toISOString().split('T')[0];
        const normalizedWeekStartDate = weekStartDate
          .toISOString()
          .split('T')[0];
        const normalizedWeekEndDate = weekEndDate.toISOString().split('T')[0];

        return (
          normalizedRewardDate >= normalizedWeekStartDate &&
          normalizedRewardDate <= normalizedWeekEndDate
        );
      });

      const rewardsForWeek = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + i);
        const dateString = date.toISOString().split('T')[0];

        // Find reward for the specific date
        const rewardForDate = weekRewards.find((reward) => {
          const rewardDateString = new Date(reward.createdAt)
            .toISOString()
            .split('T')[0];
          return rewardDateString === dateString;
        });

        rewardsForWeek.push({
          date: dateString,
          totalRewards: rewardForDate ? rewardForDate.totalRewards : 0,
          userStaking: rewardForDate ? rewardForDate.userStaking : 0,
          _id: rewardForDate ? rewardForDate._id : null,
          todayDate: dateString === today, // Add todayDate field
        });
      }

      // Calculate the total weekly rewards
      const totalWeeklyRewards = rewardsForWeek.reduce(
        (total, reward) => total + reward.totalRewards,
        0
      );

      return { totalWeeklyRewards, rewardsForWeek };
    };

    // Loop through each week from startDate to lastLogin
    let currentWeekStartDate = new Date(startDate);
    let weekNumber = 1;
    while (currentWeekStartDate <= lastLogin) {
      // Calculate the end of the current week (7 days from currentWeekStartDate)
      const currentWeekEndDate = new Date(currentWeekStartDate);
      currentWeekEndDate.setDate(currentWeekStartDate.getDate() + 6); // 7-day period

      // If the week exceeds lastLogin, adjust the endDate to lastLogin
      if (currentWeekEndDate > lastLogin) {
        currentWeekEndDate.setDate(lastLogin.getDate());
      }

      // Get rewards for the current week
      const weeklyData = getRewardsForWeek(
        currentWeekStartDate,
        currentWeekEndDate
      );

      weeklyRewards[`week${weekNumber}`] = {
        startDate: currentWeekStartDate.toISOString().split('T')[0],
        endDate: currentWeekEndDate.toISOString().split('T')[0], // End date is calculated
        ...weeklyData,
      };

      logger.info(
        `Week ${weekNumber} rewards calculated from ${
          currentWeekStartDate.toISOString().split('T')[0]
        } to ${currentWeekEndDate.toISOString().split('T')[0]}`
      );

      // Move to the next week
      currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
      weekNumber++;
    }

    // Send the response
    logger.info(
      `Weekly rewards calculation completed for telegramId: ${telegramId}`
    );
    res.json(weeklyRewards);
  } catch (err) {
    logger.error(
      `Error calculating weekly rewards for telegramId: ${telegramId} - ${err.message}`
    );
    next(err);
  }
};

const addWalletAddress = async (req, res, next) => {
  const { telegramId } = req.params
  const { userWalletAddress } = req.body

  try {
    // Find the user by telegramId
    const user = await User.findOne({ telegramId })

    if (!user) {
      // Log and return if the user is not found
      logger.error(`User with telegramId: ${telegramId} not found`)
      return res.status(404).json({
        message: 'User not found'
      })
    }

    // Update the user's wallet address (ensure correct field name)
    user.userWalletAddress = userWalletAddress // Make sure this matches the field name in your schema
    await user.save()

    // Log success and respond
    logger.info(`Wallet address updated for user: ${telegramId}`)
    return res.status(200).json({
      message: 'Wallet address updated successfully'
    })
  } catch (err) {
    logger.error(
      `Error updating wallet address for telegramId: ${telegramId} - ${err.message}`
    )
    next(err)
  }
}

const tutorialStatus = async (req, res, next) => {
  try {
    const { telegramId } = req.params
    const { tutorialStatus } = req.body

    // Find the user by telegramId and update the tutorialStatus
    const updatedUser = await User.findOneAndUpdate(
      { telegramId },
      { tutorialStatus },
      { new: true } // Return the updated document
    )

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    res
      .status(200)
      .json({
        message: 'Tutorial status updated successfully',
        user: updatedUser
      })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  login,
  userDetails,
  userGameRewards,
  purchaseGameCards,
  weekRewards,
  userTaskRewards,
  addWalletAddress,
  tutorialStatus
}
