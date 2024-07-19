const User = require("../models/userModel");

const levelUpBonuses = [
    500,    // Level 1 to Level 2
    1000,   // Level 2 to Level 3
    5000,   // Level 3 to Level 4
    10000,  // Level 4 to Level 5
    20000,  // Level 5 to Level 6
    50000,  // Level 6 to Level 7
    100000, // Level 7 to Level 8
    250000, // Level 8 to Level 9
    500000, // Level 9 to Level 10
    1000000 // Level 10 and above
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
    { limit: 10000000, rewardPerSecond: 10, level: 10 }
];

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
                let nextThreshold = thresholds.find(t => t.limit > currentTotalRewards);
                let secondsAtThisRate = nextThreshold
                    ? Math.min(remainingSeconds, nextThreshold.limit - currentTotalRewards)
                    : remainingSeconds;

                // Add the rewards for these seconds
                newRewards += secondsAtThisRate * rewardPerSecond;
                currentTotalRewards += secondsAtThisRate;
                remainingSeconds -= secondsAtThisRate;
            }
        } else {
            // If the user is already at level 10, add rewards at level 10 rate
            const level10RewardPerSecond = thresholds.find(t => t.level === 10).rewardPerSecond;
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
            level: user.level
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { userWatchRewards };
