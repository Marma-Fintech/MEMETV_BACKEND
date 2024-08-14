const User = require("../models/userModel");

// Function to generate a 5-character alphanumeric identifier
const generateRefId = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

// const levelUpBonuses = [
//   10, // Level 2 to Level 3
//   20, // Level 3 to Level 4
//   30, // Level 4 to Level 5
//   40, // Level 5 to Level 6
//   50, // Level 6 to Level 7
//   60, // Level 7 to Level 8
//   70, // Level 8 to Level 9
//   80, // Level 9 to Level 10
//   90, // Level 10 and above
// ];

const levelUpBonuses = [
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
  { limit: 500, level: 1 },
  { limit: 10000, level: 2 },
  { limit: 25000, level: 3 },
  { limit: 100000, level: 4 },
  { limit: 250000, level: 5 },
  { limit: 500000, level: 6 },
  { limit: 1000000, level: 7 },
  { limit: 2000000, level: 8 },
  { limit: 5000000, level: 9 },
  { limit: 10000000, level: 10 },
];

const userEndDate = new Date("2024-09-01");

const updateLevel = (user, currentDateString) => {
  const currentDate = new Date(currentDateString);
  if (currentDate > userEndDate) {
    return; // No level updates or rewards after the end date
  }

  let currentLevel = user.level || 1;
  let newLevel = currentLevel;
  let newLevelUpPoints = 0;

  for (const threshold of thresholds) {
    if (user.totalRewards >= threshold.limit) {
      newLevel = threshold.level;
    } else {
      break;
    }
  }

  // If the level has increased, apply level-up bonuses
  if (newLevel > currentLevel) {
    for (let i = currentLevel; i < newLevel; i++) {
      newLevelUpPoints += levelUpBonuses[i - 1]; // Accumulate the bonuses
    }
    user.totalRewards += newLevelUpPoints; // Add total bonuses to totalRewards
    user.levelUpRewards += newLevelUpPoints; // Add total bonuses to levelUpRewards
    user.level = newLevel;
  }

  // Update dailyRewards with the new level-up points
  if (newLevelUpPoints > 0) {
    const today = new Date(currentDateString);
    today.setUTCHours(0, 0, 0, 0);

    let dailyReward = user.dailyRewards.find((dr) => {
      const rewardDate = new Date(dr.createdAt);
      rewardDate.setUTCHours(0, 0, 0, 0);
      return rewardDate.getTime() === today.getTime();
    });

    if (dailyReward) {
      dailyReward.totalRewards += newLevelUpPoints;
    } else {
      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: newLevelUpPoints,
        userStaking: false,
        createdAt: today,
      });
    }
  }
};


const login = async (req, res, next) => {
  let { name, referredById, telegramId } = req.body;
  try {
    name = name.trim();
    telegramId = telegramId.trim();
    const refId = generateRefId(); // Implement this function to generate a refId

    let user = await User.findOne({ telegramId });
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split("T")[0]; // e.g., "2024-08-13"

    if (currentDate > userEndDate) {
      if (!user) {
        return res.status(403).json({
          message: "No new users can be created after the end date",
        });
      } else {
        user.lastLogin = currentDate;
        await user.save();
        return res.status(201).json({
          message: "User logged in successfully",
          user,
          warning: "No rewards can be calculated after the end date",
        });
      }
    }

    let referringUser = null;
    if (referredById) {
      referringUser = await User.findOne({ refId: referredById });

      if (!referringUser) {
        referredById = ""; // Set to null if referring user not found
        console.error("Referring user not found");
      }
    }

    if (!user) {
      user = new User({
        name,
        telegramId,
        refId,
        referredById,
        boosters: ["levelUp", "tap"],
        totalRewards: 500,
        referRewards: 0,
        lastLogin: currentDate,
        level: 1,
        levelUpRewards: 500,
      });

      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: 500,
        createdAt: currentDate,
      });

      await user.save();

      if (referringUser) {
        referringUser.yourReferenceIds.push({ userId: user._id });
        const referralReward = 10000;

        referringUser.totalRewards += referralReward;
        referringUser.referRewards += referralReward;

        const milestoneRewards = calculateMilestoneRewards(referringUser.yourReferenceIds.length);
        referringUser.referRewards += milestoneRewards; // Add milestone rewards to referRewards
        referringUser.totalRewards += milestoneRewards;

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayString = today.toISOString().split("T")[0];

        let dailyReward = referringUser.dailyRewards.find((dr) => {
          const rewardDate = new Date(dr.createdAt);
          rewardDate.setUTCHours(0, 0, 0, 0);
          return rewardDate.toISOString().split("T")[0] === todayString;
        });

        const totalDailyRewards = referralReward + milestoneRewards;

        if (dailyReward) {
          dailyReward.totalRewards += totalDailyRewards;
        } else {
          referringUser.dailyRewards.push({
            userId: referringUser._id,
            telegramId: referringUser.telegramId,
            totalRewards: totalDailyRewards,
            createdAt: today,
          });
        }

        referringUser.boosters.push("2x");

        updateLevel(referringUser, currentDateString);

        await referringUser.save();
      }
    } else {
      const lastLoginDate = new Date(user.lastLogin);
      const lastLoginDay = lastLoginDate.getUTCDate();
      const lastLoginMonth = lastLoginDate.getUTCMonth();
      const lastLoginYear = lastLoginDate.getUTCFullYear();

      if (
        currentDate.getUTCFullYear() > lastLoginYear ||
        currentDate.getUTCMonth() > lastLoginMonth ||
        currentDate.getUTCDate() > lastLoginDay
      ) {
        user.boosters.push("levelUp", "tap");
      }

      user.lastLogin = currentDate;
      await user.save();
    }

    updateLevel(user, currentDateString);

    res.status(201).json({
      message: `User logged in successfully`,
      user,
    });
  } catch (err) {
    next(err);
  }
};

const calculateMilestoneRewards = (numberOfReferrals) => {
  const milestones = [
    { referrals: 3, reward: 20000 },
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
    { referrals: 100, reward: 666667 },
  ];

  return milestones.reduce((totalReward, milestone) => {
    if (numberOfReferrals >= milestone.referrals) {
      return totalReward + milestone.reward;
    }
    return totalReward;
  }, 0);
};






const userDetails = async (req, res, next) => {
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

    // Return the user details in the response
    return res.status(200).json(userDetail);
  } catch (error) {
    // Handle any errors that occur
    return res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

const userGameRewards = async (req, res, next) => {
  try {
    const { telegramId, boosters, gamePoints } = req.body;

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
        message:
          "User has reached the end date. No rewards or boosters can be added.",
        user,
      });
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

      // Update gameRewards
      user.gameRewards.gamePoints += pointsToAdd;
      user.gameRewards.createdAt = now; // Update createdAt to the current date and time
    }

    const currentDateString = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Check if there is an existing entry for today in dailyRewards
    let lastDailyReward = user.dailyRewards[user.dailyRewards.length - 1];
    const lastRewardDateString = lastDailyReward
      ? new Date(lastDailyReward.createdAt).toISOString().split("T")[0]
      : null;

    if (lastRewardDateString !== currentDateString) {
      // Create a new dailyReward entry for today
      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: pointsToAdd, // Store only the points added today
        userStaking: false,
        createdAt: now,
      });
    } else {
      // Update the existing entry for today
      lastDailyReward.totalRewards += pointsToAdd;
      lastDailyReward.updatedAt = now;
    }

    // Update the user's level and levelUpRewards based on the new totalRewards
    updateLevel(user, currentDateString);

    // Save the updated user document
    await user.save();

    return res
      .status(200)
      .json({ message: "Boosters and gamePoints added successfully", user });
  } catch (err) {
    next(err);
  }
};

const purchaseGameCards = async (req, res, next) => {
  try {
    const { telegramId, gamePoints } = req.body;

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
        user,
      });
    }

    // Ensure gamePoints is a number
    const pointsToDeduct = Number(gamePoints) || 0;

    // Check if the user has enough points
    if (
      user.totalRewards >= pointsToDeduct &&
      user.gameRewards.gamePoints >= pointsToDeduct
    ) {
      // Deduct points from totalRewards and gameRewards
      user.totalRewards -= pointsToDeduct;
      user.gameRewards.gamePoints -= pointsToDeduct;

      // Save the updated user document
      await user.save();

      return res
        .status(200)
        .json({ message: "Game cards purchased successfully", user });
    } else {
      return res.status(400).json({ message: "Not enough points available" });
    }
  } catch (err) {
    next(err);
  }
};

const weekRewards = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Find user by telegramId
    const userDetail = await User.findOne({ telegramId: telegramId });

    // Check if user exists
    if (!userDetail) {
      return res.status(404).json({ message: "User not found" });
    }

    // Define the start and end dates
    const startDate = new Date("2024-07-22");
    const endDate = new Date("2024-09-29");

    // Initialize object to hold weekly rewards
    const weeklyRewards = {};

    // Helper function to get rewards for a specific week
    const getRewardsForWeek = (weekStartDate, weekEndDate) => {
      const weekRewards = userDetail.dailyRewards.filter((reward) => {
        const rewardDate = new Date(reward.createdAt);
        return rewardDate >= weekStartDate && rewardDate <= weekEndDate;
      });

      const rewardsForWeek = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + i);
        const dateString = date.toISOString().split("T")[0];

        // Find reward for the specific date
        const rewardForDate = weekRewards.find((reward) => {
          const rewardDateString = new Date(reward.createdAt)
            .toISOString()
            .split("T")[0];
          return rewardDateString === dateString;
        });

        rewardsForWeek.push({
          date: dateString,
          totalRewards: rewardForDate ? rewardForDate.totalRewards : 0,
        });
      }

      // Calculate the total weekly rewards
      const totalWeeklyRewards = rewardsForWeek.reduce(
        (total, reward) => total + reward.totalRewards,
        0
      );

      return { totalWeeklyRewards, rewardsForWeek };
    };

    // Loop through each week from startDate to endDate
    let currentWeekStartDate = new Date(startDate);
    let weekNumber = 1;
    while (currentWeekStartDate <= endDate) {
      const currentWeekEndDate = new Date(currentWeekStartDate);
      currentWeekEndDate.setDate(currentWeekStartDate.getDate() + 6); // End of the current week

      // Adjust the end date if it exceeds the specified endDate
      if (currentWeekEndDate > endDate) {
        currentWeekEndDate.setDate(endDate.getDate());
      }

      // Get rewards for the current week
      const weeklyData = getRewardsForWeek(
        currentWeekStartDate,
        currentWeekEndDate
      );
      weeklyRewards[`week${weekNumber}`] = {
        startDate: currentWeekStartDate.toISOString().split("T")[0],
        endDate: currentWeekEndDate.toISOString().split("T")[0],
        ...weeklyData,
      };

      // Move to the next week
      currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
      weekNumber++;
    }

    // Send the response
    res.json(weeklyRewards);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  userDetails,
  userGameRewards,
  purchaseGameCards,
  weekRewards,
};
