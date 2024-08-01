const User = require("../models/userModel");
const mongoose = require("mongoose");
const { isValidObjectId } = mongoose;

const levelUpBonuses = [
  // 500, // Level 1 bonous, you reach 1000 its level2 you got level2 bonous points
  1000, // Level 2 to Level 3
  5000, // Level 3 to Level 4
  10000, // Level 4 to Level 5
  20000, // Level 5 to Level 6
  50000, // Level 6 to Level 7
  100000, // Level 7 to Level 8
  250000, // Level 8 to Level 9
  500000, // Level 9 to Level 10
  1000000, // Level 10 and above
];

const thresholds = [
  { limit: 0, rewardPerSecond: 1, level: 1 },
  { limit: 1000, rewardPerSecond: 2, level: 2 },
  { limit: 10000, rewardPerSecond: 3, level: 3 },
  { limit: 50000, rewardPerSecond: 4, level: 4 },
  { limit: 100000, rewardPerSecond: 5, level: 5 },
  { limit: 250000, rewardPerSecond: 6, level: 6 },
  { limit: 500000, rewardPerSecond: 7, level: 7 },
  { limit: 1000000, rewardPerSecond: 8, level: 8 },
  { limit: 5000000, rewardPerSecond: 9, level: 9 },
  { limit: 10000000, rewardPerSecond: 10, level: 10 },
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

    // Get the current date and time
    const now = new Date();

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the current date is past the userEndDate
    if (now > userEndDate) {
      // No rewards or boosters can be processed after the end date
      return res.status(403).json({
        message: "User has reached the end date. No rewards or boosters can be processed.",
        user
      });
    }

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

    // Update user level and total rewards with the level-up bonus
    user.level = newLevel;
    user.totalRewards += levelUpBonus;

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split("T")[0];

    // Calculate total daily rewards including level-up bonuses and boosterPoints
    let dailyRewardAmount = newRewards + levelUpBonus + parsedBoosterPoints;

    // Check if there's already an entry for today in dailyRewards
    let dailyReward = user.dailyRewards.find(
      (reward) => reward.createdAt.toISOString().split("T")[0] === currentDate
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
    }

    // Save the updated user
    await user.save();

    res.status(200).json({
      message: "Rewards and level updated successfully",
      name: user.name,
      telegramId: user.telegramId,
      refId: user.refId,
      refferedById: user.refferedById,
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
    next(err);
  }
};

const boosterDetails = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Find the user detail document for the given telegramId
    const userDetail = await User.findOne({ telegramId: telegramId });

    // Check if user detail was found
    if (!userDetail) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the boosters array along with other relevant user details
    res.status(200).json({
      message: "User details fetched successfully",
      boosters: userDetail.boosters,
    });
  } catch (err) {
    next(err);
  }
};

const purchaseBooster = async (req, res, next) => {
  try {
    const { telegramId, boosterPoints, booster } = req.body;

    // Get the current date and time
    const now = new Date();

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the current date is past the userEndDate
    if (now > userEndDate) {
      return res.status(403).json({
        message: "User has reached the end date. No purchases can be made.",
        user
      });
    }

    // Check if the user has enough boosterPoints available in both totalRewards and watchRewards
    if (
      user.totalRewards < boosterPoints ||
      user.watchRewards < boosterPoints
    ) {
      return res
        .status(400)
        .json({ message: "Not enough purchase points available" });
    }

    // Deduct the boosterPoints from totalRewards and watchRewards
    user.totalRewards -= boosterPoints;
    user.watchRewards -= boosterPoints;

    // Push the booster into the boosters array
    user.boosters.push(booster);

    // Save the updated user
    await user.save();

    res.status(200).json({ message: "Booster purchased successfully", user });
  } catch (err) {
    next(err);
  }
};

const stakingRewards = async (req, res, next) => {
  try {
    const { stakingId } = req.body;

    // Validate stakingId
    if (!isValidObjectId(stakingId)) {
      return res.status(400).json({ message: "Invalid stakingId format" });
    }

    // Find the user with the matching stakingId in dailyRewards array
    const user = await User.findOne({
      "dailyRewards._id": stakingId,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the specific reward in the dailyRewards array
    const reward = user.dailyRewards.id(stakingId);

    if (reward.userStaking) {
      return res.status(400).json({ message: "User has already staked" });
    }

    // Calculate the doubled reward
    const doubledReward = reward.totalRewards * 2;

    // Update the totalRewards and userStaking in the dailyRewards array
    reward.totalRewards = doubledReward;
    reward.userStaking = true;

    // Update the user's totalRewards and stakingRewards
    user.totalRewards += doubledReward;
    user.stakingRewards += doubledReward;

    // Add the staking information to the staking array
    user.staking.push({
      userId: reward.userId,
      createdAt: new Date(),
    });

    // Save the updated user document
    await user.save();

    res
      .status(200)
      .json({ message: "Staking rewards updated successfully", user });
  } catch (err) {
    next(err);
  }
};

const popularUser = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Retrieve all users sorted by totalRewards in descending order
    const allUsers = await User.find().sort({ totalRewards: -1 });

    // Find the rank of the specific user
    const userIndex = allUsers.findIndex(
      (user) => user.telegramId === telegramId
    );

    if (userIndex === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the user details and rank
    const userDetail = allUsers[userIndex];
    const userRank = userIndex + 1; // Rank is index + 1

    // Format user details
    const userFormattedDetail = {
      rank: userRank,
      telegramId: userDetail.telegramId,
      name: userDetail.name,
      level: userDetail.level,
      totalRewards: userDetail.totalRewards,
    };

    // Get the top 100 users
    const topUsers = allUsers.slice(0, 100).map((user, index) => ({
      rank: index + 1,
      telegramId: user.telegramId,
      name: user.name,
      level: user.level,
      totalRewards: user.totalRewards,
    }));

    res.status(200).json({
      topUsers,
      yourDetail: userFormattedDetail,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  userWatchRewards,
  boosterDetails,
  purchaseBooster,
  stakingRewards,
  popularUser,
};
