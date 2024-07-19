const User = require("../models/userModel");

const userWatchRewards = async (req, res, next) => {
    try {
        const { telegramId, userWatchSeconds } = req.body;

        // Find the user by telegramId
        const user = await User.findOne({ telegramId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Define the thresholds and corresponding rewards per second
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

        let remainingSeconds = userWatchSeconds;
        let newRewards = 0;
        let currentTotalRewards = user.totalRewards;

        while (remainingSeconds > 0) {
            let rewardPerSecond = 1;

            // Determine the current reward rate
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

        user.totalRewards += newRewards;

        // Update the user's level based on totalRewards
        let newLevel = 1;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (user.totalRewards >= thresholds[i].limit) {
                newLevel = thresholds[i].level;
                break;
            }
        }
        user.level = newLevel;

        // Save the updated user
        await user.save();

        res.status(200).json({ message: "Rewards and level updated successfully", totalRewards: user.totalRewards, level: user.level });
    } catch (err) {
        next(err);
    }
};

module.exports = { userWatchRewards };
