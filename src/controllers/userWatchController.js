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

const calculateLevelAndProgress = (totalRewards) => {
    let currentLevel = 0;
    let nextLevelThreshold = 0;
    let previousLevelThreshold = 0;
  
    for (let i = 0; i < levelUpBonuses.length; i++) {
      if (totalRewards < levelUpBonuses[i]) {
        currentLevel = i + 1;
        nextLevelThreshold = levelUpBonuses[i];
        previousLevelThreshold = i > 0 ? levelUpBonuses[i - 1] : 0;
        break;
      }
    }
  
    if (totalRewards >= levelUpBonuses[levelUpBonuses.length - 1]) {
      currentLevel = levelUpBonuses.length + 1; // Level 11 and above
      nextLevelThreshold = Infinity; // No upper limit
      previousLevelThreshold = levelUpBonuses[levelUpBonuses.length - 1];
    }
  
    const progress = totalRewards >= previousLevelThreshold
      ? (totalRewards - previousLevelThreshold) / (nextLevelThreshold - previousLevelThreshold)
      : 0;
  
    return {
      currentLevel,
      progressPercentage: progress * 100
    };
  };
  
  const levelDetails = async (req, res, next) => {
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
  
      // Calculate level and progress
      const { currentLevel, progressPercentage } = calculateLevelAndProgress(userDetail.totalRewards);
  
      // Prepare level info
      const levelInfo = {
        level: currentLevel,
        rewards: userDetail.totalRewards,
        progressPercentage: progressPercentage.toFixed(2) // Format to 2 decimal places
      };
  
      // Send the level details in the response
      res.json(levelInfo);
    } catch (error) {
      next(error);
    }
  };

const userWatchRewards = async (req, res, next) => {
  try {
    const { telegramId, userWatchSeconds } = req.body;

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

    // Add the new rewards to total rewards
    user.totalRewards += newRewards;

    // Determine the new level
    let newLevel = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (user.totalRewards >= thresholds[i].limit) {
        newLevel = thresholds[i].level;
        break;
      }
    }

    // Apply level-up bonus if user levels up
    if (newLevel > previousLevel) {
      // Apply bonus for all level-ups
      for (let level = previousLevel; level < newLevel; level++) {
        let bonusIndex = level - 1; // Bonus for previous level
        if (bonusIndex >= 0 && bonusIndex < levelUpBonuses.length) {
          user.totalRewards += levelUpBonuses[bonusIndex];
        }
      }
    }

    // Update user level
    user.level = newLevel;

    // Save the updated user
    await user.save();

    res.status(200).json({
      message: "Rewards and level updated successfully",
      name: user.name,
      telegramId: user.telegramId,
      totalRewards: user.totalRewards,
      level: user.level,
    });
  } catch (err) {
    next(err);
  }
};


const boosterDetails = async (req,res,next) => {
  try {
    
  } catch (err) {
    next(er)
  }
}
module.exports = { userWatchRewards, levelDetails, boosterDetails };
