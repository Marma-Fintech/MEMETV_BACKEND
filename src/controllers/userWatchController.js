const User = require("../models/userModel");
const mongoose = require("mongoose");
const { isValidObjectId } = mongoose;
const logger = require("../helpers/logger");

const levelUpBonuses = [
  // 500, // Level 1 bonus, you reach 1000 its level2 you got level2 bonus points
  1000, // Level 2 to Level 3
  10000, // Level 3 to Level 4
  50000, // Level 4 to Level 5
  100000, // Level 5 to Level 6
  500000, // Level 6 to Level 7
  1000000, // Level 7 to Level 8
  5000000, // Level 8 to Level 9
  10000000, // Level 9 to Level 10
  20000000, // Level 10 and above
];

const thresholds = [
  { limit: 0, rewardPerSecond: 1, level: 1 },
  { limit: 10000, rewardPerSecond: 2, level: 2 },
  { limit: 50000, rewardPerSecond: 3, level: 3 },
  { limit: 200000, rewardPerSecond: 4, level: 4 },
  { limit: 800000, rewardPerSecond: 5, level: 5 },
  { limit: 3000000, rewardPerSecond: 6, level: 6 },
  { limit: 10000000, rewardPerSecond: 7, level: 7 },
  { limit: 25000000, rewardPerSecond: 8, level: 8 },
  { limit: 50000000, rewardPerSecond: 9, level: 9 },
  { limit: 80000000, rewardPerSecond: 10, level: 10 },
];

const userEndDate = new Date("2024-09-01");

const userWatchRewards = async (req, res, next) => {
  try {
    const {
      telegramId,
      userWatchSeconds,
      boosterPoints = 0,
      boosters,
    } = req.body;

    // Log the incoming request
    logger.info(
      `Received request to process watch rewards for telegramId: ${telegramId}`
    );

    // Get the current date and time
    const now = new Date();
    const currentDateString = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    // Check if user exists
    if (!user) {
      logger.warn(`User not found for telegramId: ${telegramId}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Log user found
    logger.info(`User found for telegramId: ${telegramId}`);

    // Check if the current date is past the userEndDate
    if (now > userEndDate) {
      logger.warn(
        `User has reached the end date for telegramId: ${telegramId}`
      );
      return res.status(403).json({
        message:
          "User has reached the end date. No rewards or boosters can be processed.",
        user,
      });
    }

    logger.info(`Calculating rewards for telegramId: ${telegramId}`);

    let remainingSeconds = userWatchSeconds;
    let newRewards = 0;
    let currentTotalRewards = user.totalRewards;
    let previousLevel = user.level;

    // Calculate rewards based on user level
    if (user.level < 10) {
      while (remainingSeconds > 0) {
        // Determine the current reward rate
        let rewardPerSecond;
        for (let i = thresholds.length - 1; i >= 0; i--) {
          if (currentTotalRewards >= thresholds[i].limit) {
            rewardPerSecond = thresholds[i].rewardPerSecond;
            break;
          }
        }

        // Determine how many seconds can be applied at the current rate
        let nextThreshold = thresholds.find(
          (t) => t.limit > currentTotalRewards
        );
        let secondsAtThisRate = nextThreshold
          ? Math.min(
              remainingSeconds,
              nextThreshold.limit - currentTotalRewards
            )
          : remainingSeconds;

        // Add the rewards for these seconds
        newRewards += secondsAtThisRate * rewardPerSecond;
        currentTotalRewards += secondsAtThisRate;
        remainingSeconds -= secondsAtThisRate;
      }
    } else {
      // If the user is already at level 10, add rewards at level 10 rate
      const level10RewardPerSecond = thresholds.find(
        (t) => t.level === 10
      ).rewardPerSecond;
      newRewards = remainingSeconds * level10RewardPerSecond;
    }

    // Log the rewards calculation
    logger.info(
      `Rewards calculated for telegramId: ${telegramId}, newRewards: ${newRewards}`
    );

    // Include boosterPoints in totalRewards
    const parsedBoosterPoints = parseFloat(boosterPoints);
    user.totalRewards += newRewards + parsedBoosterPoints;

    // Determine the new level
    let newLevel = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (user.totalRewards >= thresholds[i].limit) {
        newLevel = thresholds[i].level;
        break;
      }
    }

    // Store the level-up bonuses separately
    let levelUpBonus = 0;

    // Apply level-up bonus if user levels up
    if (newLevel > previousLevel) {
      // Apply bonus for all level-ups
      for (let level = previousLevel; level < newLevel; level++) {
        let bonusIndex = level - 1; // Bonus for previous level
        if (bonusIndex >= 0 && bonusIndex < levelUpBonuses.length) {
          levelUpBonus += levelUpBonuses[bonusIndex];
        }
      }
    }

    // Log the level-up process
    logger.info(
      `Level-up bonus calculated for telegramId: ${telegramId}, levelUpBonus: ${levelUpBonus}`
    );

    // Update user level and total rewards with the level-up bonus
    user.level = newLevel;
    user.totalRewards += levelUpBonus;

    // Calculate total daily rewards including level-up bonuses and boosterPoints
    let dailyRewardAmount = newRewards + levelUpBonus + parsedBoosterPoints;

    // Check if the system date is earlier than the last dailyRewards date
    let lastDailyReward = user.dailyRewards[user.dailyRewards.length - 1];
    if (lastDailyReward) {
      const lastRewardDateString = new Date(lastDailyReward.createdAt)
        .toISOString()
        .split("T")[0];
      if (currentDateString < lastRewardDateString) {
        // If current date is earlier than last dailyRewards date, prevent updating
        logger.warn(
          `Attempt to add rewards on a previous date. Current date: ${currentDateString}, Last daily rewards date: ${lastRewardDateString}`
        );
        return res.status(400).json({
          message: "Cannot add rewards for a previous date.",
        });
      }
    }

    // Check if there's already an entry for today in dailyRewards
    let dailyReward = user.dailyRewards.find(
      (reward) =>
        new Date(reward.createdAt).toISOString().split("T")[0] ===
        currentDateString
    );

    if (dailyReward) {
      // Update the existing entry for today
      dailyReward.totalRewards += dailyRewardAmount;
    } else {
      // Create a new entry for today
      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: dailyRewardAmount,
        createdAt: new Date(),
      });
    }

    // Log daily rewards update
    logger.info(
      `Daily rewards updated for telegramId: ${telegramId}, amount: ${dailyRewardAmount}`
    );

    // Update watchRewards and levelUpRewards fields
    user.watchRewards =
      (user.watchRewards || 0) + newRewards + parsedBoosterPoints;
    user.levelUpRewards = (user.levelUpRewards || 0) + levelUpBonus;

    // Remove only the specified boosters from the user's boosters array
    if (boosters && boosters.length > 0) {
      boosters.forEach((booster) => {
        const index = user.boosters.indexOf(booster);
        if (index > -1) {
          user.boosters.splice(index, 1); // Remove the first occurrence of the booster
        }
      });

      logger.info(`Boosters updated for telegramId: ${telegramId}`);
    }

    // Save the updated user
    await user.save();

    logger.info(
      `Rewards and level updated successfully for telegramId: ${telegramId}`
    );

    res.status(200).json({
      message: "Rewards and level updated successfully",
      name: user.name,
      telegramId: user.telegramId,
      refId: user.refId,
      referredById: user.referredById,
      totalRewards: user.totalRewards,
      level: user.level,
      dailyRewards: user.dailyRewards,
      watchRewards: user.watchRewards,
      levelUpRewards: user.levelUpRewards,
      referRewards: user.referRewards,
      gameRewards: user.gameRewards,
      stakingRewards: user.stakingRewards,
      boosters: user.boosters,
      lastLogin: user.lastLogin,
      yourReferenceIds: user.yourReferenceIds,
      staking: user.staking,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    logger.error(
      `Error processing rewards for telegramId: ${telegramId} - ${err.message}`
    );
    next(err);
  }
};

const boosterDetails = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Log the incoming request
    logger.info(
      `Received request to fetch booster details for telegramId: ${telegramId}`
    );

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Find the user detail document for the given telegramId
    const userDetail = await User.findOne({ telegramId: telegramId });

    // Check if user detail was found
    if (!userDetail) {
      logger.warn(`User not found for telegramId: ${telegramId}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Log successful retrieval of user details
    logger.info(
      `User details fetched successfully for telegramId: ${telegramId}`
    );

    // Return the boosters array along with other relevant user details
    res.status(200).json({
      message: "User details fetched successfully",
      boosters: userDetail.boosters,
    });
  } catch (err) {
    // Log any errors
    logger.error(
      `Error fetching booster details for telegramId: ${telegramId} - ${err.message}`
    );
    next(err);
  }
};

const purchaseBooster = async (req, res, next) => {
  try {
    const { telegramId, boosterPoints, booster, boosterCount } = req.body;

    // Log the incoming request
    logger.info(
      `Received request to purchase booster for telegramId: ${telegramId}`
    );

    // Get the current date and time
    const now = new Date();

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    // Check if the user exists
    if (!user) {
      logger.warn(`User not found for telegramId: ${telegramId}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the current date is past the userEndDate
    if (now > userEndDate) {
      logger.info(
        `Attempted purchase after userEndDate for telegramId: ${telegramId}`
      );
      return res.status(403).json({
        message: "User has reached the end date. No purchases can be made.",
        user,
      });
    }

    // Check if the user has enough boosterPoints available in both totalRewards and watchRewards
    const totalBoosterPoints = boosterPoints;
    if (
      user.totalRewards < totalBoosterPoints ||
      user.watchRewards < totalBoosterPoints
    ) {
      logger.warn(
        `Insufficient points for booster purchase for telegramId: ${telegramId}`
      );
      return res
        .status(400)
        .json({ message: "Not enough purchase points available" });
    }

    // Deduct the total boosterPoints from totalRewards and watchRewards
    user.totalRewards -= totalBoosterPoints;
    user.watchRewards -= totalBoosterPoints;

    // Log the deduction of points
    logger.info(
      `Deducted ${totalBoosterPoints} points for telegramId: ${telegramId}`
    );

    // Push the booster multiple times based on boosterCount into the boosters array
    for (let i = 0; i < boosterCount; i++) {
      user.boosters.push(booster);
    }

    // Save the updated user
    await user.save();

    // Log successful purchase
    logger.info(`Booster purchased successfully for telegramId: ${telegramId}`);

    res.status(200).json({ message: "Booster purchased successfully", user });
  } catch (err) {
    // Log any errors
    logger.error(
      `Error during booster purchase for telegramId: ${telegramId} - ${err.message}`
    );
    next(err);
  }
};

const stakingRewards = async (req, res, next) => {
  try {
    const { stakingId } = req.body;

    // Log the incoming request
    logger.info(
      `Received request to process staking rewards for stakingId: ${stakingId}`
    );

    // Validate stakingId
    if (!isValidObjectId(stakingId)) {
      logger.warn(`Invalid stakingId format: ${stakingId}`);
      return res.status(400).json({ message: "Invalid stakingId format" });
    }

    // Find the user with the matching stakingId in dailyRewards array
    const user = await User.findOne({
      "dailyRewards._id": stakingId,
    });

    if (!user) {
      logger.warn(`User not found for stakingId: ${stakingId}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Find the specific reward in the dailyRewards array
    const reward = user.dailyRewards.id(stakingId);

    if (reward.userStaking) {
      logger.info(`User has already staked for stakingId: ${stakingId}`);
      return res.status(400).json({ message: "User has already staked" });
    }

    // Calculate the additional reward
    const additionalReward = reward.totalRewards;

    // Double the total reward
    const doubledReward = reward.totalRewards * 2;

    // Update the totalRewards and userStaking in the dailyRewards array
    reward.totalRewards = doubledReward;
    reward.userStaking = true;

    // Update the user's totalRewards and stakingRewards
    user.totalRewards += additionalReward; // Only add the extra amount to totalRewards
    user.stakingRewards += additionalReward; // Add the same extra amount to stakingRewards

    // Log the reward update
    logger.info(
      `Doubled rewards for stakingId: ${stakingId}, added ${additionalReward} to user ${user._id}`
    );

    // Check for level-up bonuses and update the user's level
    let currentLevel = user.level;
    while (
      currentLevel < thresholds.length &&
      user.totalRewards >= thresholds[currentLevel].limit
    ) {
      // Apply level-up bonus if the user is leveling up
      if (
        currentLevel > 0 &&
        user.totalRewards >= thresholds[currentLevel].limit
      ) {
        const levelUpBonus = levelUpBonuses[currentLevel - 1];
        user.totalRewards += levelUpBonus;
        user.levelUpRewards += levelUpBonus;

        // Log the level-up
        logger.info(
          `User ${user._id} leveled up to ${
            currentLevel + 1
          } with bonus ${levelUpBonus}`
        );
      }
      // Increment the level
      currentLevel += 1;
    }
    user.level = currentLevel;

    // Add the staking information to the staking array
    user.staking.push({
      userId: reward.userId,
      createdAt: new Date(),
    });

    // Save the updated user document
    await user.save();

    // Log the successful staking update
    logger.info(
      `Staking rewards updated successfully for stakingId: ${stakingId}, userId: ${user._id}`
    );

    res
      .status(200)
      .json({ message: "Staking rewards updated successfully", user });
  } catch (err) {
    // Log any errors
    logger.error(
      `Error processing staking rewards for stakingId: ${stakingId} - ${err.message}`
    );
    next(err);
  }
};

const popularUser = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Log the incoming request
    logger.info(
      `Received request to retrieve popular user data for telegramId: ${telegramId}`
    );

    // Retrieve all users sorted by totalRewards in descending order
    const allUsers = await User.find().sort({ totalRewards: -1 });

    // Find the rank of the specific user
    const userIndex = allUsers.findIndex(
      (user) => user.telegramId === telegramId
    );

    if (userIndex === -1) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    // Get the user details and rank
    const userDetail = allUsers[userIndex];
    const userRank = userIndex + 1; // Rank is index + 1

    // Log the user rank and details
    logger.info(
      `User found: telegramId: ${telegramId}, rank: ${userRank}, totalRewards: ${userDetail.totalRewards}`
    );

    // Format user details
    const userFormattedDetail = {
      rank: userRank,
      telegramId: userDetail.telegramId,
      name: userDetail.name,
      level: userDetail.level,
      totalRewards: userDetail.totalRewards,
    };

    // Get the top 10 users
    const topUsers = allUsers.slice(0, 10).map((user, index) => ({
      rank: index + 1,
      telegramId: user.telegramId,
      name: user.name,
      level: user.level,
      totalRewards: user.totalRewards,
    }));

    // Log the top 100 users retrieval
    logger.info("Retrieved top 100 users successfully");

    res.status(200).json({
      topUsers,
      yourDetail: userFormattedDetail,
    });
  } catch (err) {
    // Log any errors
    logger.error(
      `Error retrieving popular user data for telegramId: ${telegramId} - ${err.message}`
    );
    next(err);
  }
};

const yourReferrals = async (req, res, next) => {
  try {
    let { telegramId } = req.params;
    telegramId = telegramId.trim();

    // Log the incoming request
    logger.info(
      `Received request to retrieve referrals for telegramId: ${telegramId}`
    );

    // Get pagination parameters from query, set defaults if not provided
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Log pagination details
    logger.info(
      `Pagination details - Page: ${page}, Limit: ${limit}, Skip: ${skip}`
    );

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    // Log the number of referrals
    const totalReferrals = user.yourReferenceIds.length;
    logger.info(`User found - Total Referrals: ${totalReferrals}`);

    // Extract the userIds from the yourReferenceIds array
    const paginatedReferenceIds = user.yourReferenceIds.slice(
      skip,
      skip + limit
    );

    const userIds = paginatedReferenceIds.map((ref) => ref.userId);

    // Find the referenced users and select the required fields
    const referencedUsers = await User.find({ _id: { $in: userIds } }).select(
      "name totalRewards"
    );

    // Log the number of referenced users found
    logger.info(`Referenced users found: ${referencedUsers.length}`);

    // Create a map of referenced users by their ID for quick lookup
    const userMap = new Map();
    referencedUsers.forEach((refUser) => {
      userMap.set(refUser._id.toString(), refUser);
    });

    // Construct the referrals response
    const referrals = paginatedReferenceIds.map((ref) => {
      const refUser = userMap.get(ref.userId.toString());
      return {
        userId: ref.userId,
        name: refUser ? refUser.name : "Unknown", // Handle case where referenced user is not found
        totalRewards: refUser ? refUser.totalRewards : 0, // Handle case where referenced user is not found
        createdAt: ref.createdAt,
      };
    });

    // Log the response details
    logger.info(
      `Referrals retrieved successfully for telegramId: ${telegramId}`
    );

    res.status(200).json({
      referrals,
      total: totalReferrals,
      page,
      limit,
      totalPages: Math.ceil(totalReferrals / limit),
    });
  } catch (err) {
    // Log any errors
    logger.error(
      `Error retrieving referrals for telegramId: ${telegramId} - ${err.message}`
    );
    next(err);
  }
};

module.exports = {
  userWatchRewards,
  boosterDetails,
  purchaseBooster,
  stakingRewards,
  popularUser,
  yourReferrals,
};
