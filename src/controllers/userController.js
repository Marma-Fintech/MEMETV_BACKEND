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
  { limit: 1000, level: 2 },
  { limit: 10000, level: 3 },
  { limit: 50000, level: 4 },
  { limit: 100000, level: 5 },
  { limit: 250000, level: 6 },
  { limit: 500000, level: 7 },
  { limit: 1000000, level: 8 },
  { limit: 5000000, level: 9 },
  { limit: 10000000, level: 10 },
];

const updateLevel = (user) => {
  let currentLevel = user.level || 1;
  let newLevel = currentLevel;

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
      user.totalRewards += levelUpBonuses[i - 1]; // Apply the bonus for the new level
      user.levelUpRewards += levelUpBonuses[i - 1]; // Add to levelUpRewards
    }
    user.level = newLevel;
  }
};

const login = async (req, res, next) => {
  let { name, refferedById, telegramId } = req.body;
  try {
    name = name.trim();

    const refId = generateRefId(); // Implement this function to generate a refId

    let user = await User.findOne({ telegramId });

    const currentDate = new Date();
    const currentDay = currentDate.getUTCDate();
    const currentMonth = currentDate.getUTCMonth();
    const currentYear = currentDate.getUTCFullYear();

    let referringUser = null;
    if (refferedById) {
      referringUser = await User.findOne({ refId: refferedById });

      if (!referringUser) {
        refferedById = ""; // Set to null if referring user not found
        console.error("Referring user not found");
      }
    }

    if (!user) {
      user = new User({
        name,
        telegramId,
        refId,
        refferedById,
        boosters: ["levelUp", "tap"],
        totalRewards: 500,
        referRewards: 0,
        lastLogin: currentDate,
        level: 1,
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
        referringUser.totalRewards += 5000;
        referringUser.referRewards += 5000;

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const dailyReward = referringUser.dailyRewards.find((dr) => {
          const rewardDate = new Date(dr.createdAt);
          rewardDate.setUTCHours(0, 0, 0, 0);
          return rewardDate.getTime() === today.getTime();
        });

        if (dailyReward) {
          dailyReward.totalRewards += 5000;
        } else {
          referringUser.dailyRewards.push({
            userId: referringUser._id,
            telegramId: referringUser.telegramId,
            totalRewards: 5000,
            createdAt: currentDate,
          });
        }

        referringUser.boosters.push("2x");

        const numberOfReferrals = referringUser.yourReferenceIds.length;
        const milestones = [
          { referrals: 3, reward: 10000 },
          { referrals: 5, reward: 16667 },
          { referrals: 10, reward: 33333 },
          { referrals: 20, reward: 66667 },
          { referrals: 30, reward: 100000 },
          { referrals: 40, reward: 133333 },
          { referrals: 50, reward: 166667 },
          { referrals: 60, reward: 200000 },
          { referrals: 70, reward: 233333 },
          { referrals: 80, reward: 266667 },
          { referrals: 90, reward: 300000 },
          { referrals: 100, reward: 333333 },
        ];

        let totalMilestoneReward = 0;
        for (const milestone of milestones) {
          if (numberOfReferrals === milestone.referrals) {
            totalMilestoneReward += milestone.reward;
          }
        }

        referringUser.totalRewards += totalMilestoneReward;
        referringUser.referRewards += totalMilestoneReward;

        if (totalMilestoneReward > 0) {
          if (dailyReward) {
            dailyReward.totalRewards += totalMilestoneReward;
          }
        }

        updateLevel(referringUser);

        await referringUser.save();
      }
    } else {
      const lastLoginDate = new Date(user.lastLogin);
      const lastLoginDay = lastLoginDate.getUTCDate();
      const lastLoginMonth = lastLoginDate.getUTCMonth();
      const lastLoginYear = lastLoginDate.getUTCFullYear();

      if (
        currentYear > lastLoginYear ||
        currentMonth > lastLoginMonth ||
        currentDay > lastLoginDay
      ) {
        user.boosters.push("levelUp", "tap");
      }

      user.lastLogin = currentDate;
      await user.save();
    }

    updateLevel(user);

    res.status(201).json({
      message: `User logged in successfully`,
      user,
    });
  } catch (err) {
    next(err);
  }
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

    // Update the user's level and levelUpRewards based on the new totalRewards
    updateLevel(user);

    // Save the updated user document
    await user.save();

    return res
      .status(200)
      .json({ message: "Boosters and gamePoints added successfully", user });
  } catch (err) {
    next(err);
  }
};


module.exports = { login, userDetails, userGameRewards };
