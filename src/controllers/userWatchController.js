const User = require("../models/userModel");

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

const calculateLevel = (totalRewards) => {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalRewards >= thresholds[i].limit) {
      return thresholds[i].level;
    }
  }
  return 1; // Default to level 1 if no thresholds are met
};

const calculateCompletionPercentage = (totalRewards, currentLevel) => {
  const currentThreshold = thresholds.find(threshold => threshold.level === currentLevel);
  const nextThreshold = thresholds.find(threshold => threshold.level === currentLevel + 1);

  if (nextThreshold) {
    const levelRange = nextThreshold.limit - currentThreshold.limit;
    const rewardsInCurrentLevel = totalRewards - currentThreshold.limit;
    return Math.min((rewardsInCurrentLevel / levelRange) * 100, 100);
  }
  return 100; // If there is no next level, the user is at the maximum level
};

const levelDetails = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Find the user detail document for the given telegramId
    const userDetail = await User.findOne({ telegramId });

    // Check if user detail was found
    if (!userDetail) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalRewards = userDetail.totalRewards;
    const currentLevel = calculateLevel(totalRewards);
    let completionPercentage = calculateCompletionPercentage(totalRewards, currentLevel);

    // Adjust completion percentage if user has exactly the total rewards required to reach the current level
    const currentThreshold = thresholds.find(threshold => threshold.level === currentLevel);
    if (totalRewards === currentThreshold.limit) {
      completionPercentage = 100;
    }

    res.status(200).json({
      level: currentLevel,
      completionPercentage: completionPercentage,
      totalRewards: totalRewards
    });
  } catch (error) {
    next(error);
  }
};


const userWatchRewards = async (req, res, next) => {
    try {
      const { telegramId, userWatchSeconds, boosterPoints = 0 } = req.body;
  
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
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
      user.watchRewards = (user.watchRewards || 0) + newRewards + parsedBoosterPoints;
      user.levelUpRewards = (user.levelUpRewards || 0) + levelUpBonus;
  
      // Save the updated user
      await user.save();
  
      res.status(200).json({
        message: "Rewards and level updated successfully",
        name: user.name,
        telegramId: user.telegramId,
        totalRewards: user.totalRewards,
        level: user.level,
        dailyRewards: user.dailyRewards,
        watchRewards: user.watchRewards,
        levelUpRewards: user.levelUpRewards,
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
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the boosters array along with other relevant user details
    res.status(200).json({
      message: 'User details fetched successfully',
      boosters: userDetail.boosters
    });
  } catch (err) {
    next(err);
  }
};

const userGameRewards = async (req, res, next) => {
  try {
    const { telegramId, boosters, gamePoints } = req.body;

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Push new boosters into the existing boosters array
    if (boosters && boosters.length > 0) {
      user.boosters.push(...boosters);
    }

    // Ensure gamePoints is a number
    const pointsToAdd = Number(gamePoints) || 0;

    // Add gamePoints to totalRewards and gameRewards
    if (pointsToAdd > 0) {
      user.totalRewards += pointsToAdd;
      user.gameRewards += pointsToAdd;
    }

    // Save the updated user document
    await user.save();

    return res.status(200).json({ message: "Boosters and gamePoints added successfully", user });
  } catch (err) {
    next(err);
  }
};

module.exports = { userWatchRewards, levelDetails, boosterDetails,userGameRewards };
