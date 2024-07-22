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

const login = async (req, res, next) => {
  let { name, refferedById, telegramId } = req.body;
  try {
    name = name.trim();

    // Generate refId for new user
    const refId = generateRefId(); // You need to implement generateRefId() function

    // Generate game cards
    const getRandomDigit = () => Math.floor(Math.random() * 10);

    const gameCard1 = parseInt(`${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`);
    const gameCard2 = parseInt(`${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`);
    const gameCard3 = parseInt(`${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`);
    const gameCard4 = parseInt(`${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`);
    const gameCard5 = parseInt(`${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`);

    // Check if user already exists
    let user = await User.findOne({ telegramId });

    const currentDate = new Date();
    const currentDay = currentDate.getUTCDate();
    const currentMonth = currentDate.getUTCMonth();
    const currentYear = currentDate.getUTCFullYear();

    if (!user) {
      // Create a new user with the generated refId and game cards
      user = new User({
        name,
        telegramId,
        refId,
        refferedById,
        gameCard1,
        gameCard2,
        gameCard3,
        gameCard4,
        gameCard5,
        boosters: ["levelUp", "tap"], // Initialize boosters array with "levelUp" and "tap"
        totalRewards: 500, // Initial reward for new user
        lastLogin: currentDate // Set the last login time to now
      });

      // Add initial reward to dailyRewards array
      user.dailyRewards.push({
        userId: user._id,
        telegramId: user.telegramId,
        totalRewards: 500,
        createdAt: currentDate
      });

      // Save the new user to the database
      await user.save();

      // Check if there's a refferedById and find the referring user
      if (refferedById) {
        const referringUser = await User.findOne({ refId: refferedById });

        // If referring user found, add the new user's userId to their yourReferenceIds
        if (referringUser) {
          referringUser.yourReferenceIds.push({ userId: user._id });
          referringUser.totalRewards += 5000; // Add 5000 points for referral

          // Add referral reward to the referring user's dailyRewards
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);

          const dailyReward = referringUser.dailyRewards.find(dr => {
            const rewardDate = new Date(dr.createdAt);
            rewardDate.setUTCHours(0, 0, 0, 0);
            return rewardDate.getTime() === today.getTime();
          });

          if (dailyReward) {
            dailyReward.totalRewards += 5000; // Update the existing daily reward for today
          } else {
            referringUser.dailyRewards.push({
              userId: referringUser._id,
              telegramId: referringUser.telegramId,
              totalRewards: 5000,
              createdAt: currentDate
            });
          }

          // Add "2x" to the referring user's boosters array
          referringUser.boosters.push("2x");

          // Calculate additional milestone rewards if applicable
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

          // Add milestone rewards only once when milestones are reached
          let totalMilestoneReward = 0;
          for (const milestone of milestones) {
            if (numberOfReferrals === milestone.referrals) {
              totalMilestoneReward += milestone.reward;
            }
          }

          referringUser.totalRewards += totalMilestoneReward;

          if (totalMilestoneReward > 0) {
            if (dailyReward) {
              dailyReward.totalRewards += totalMilestoneReward; // Update the existing daily reward for today
            } 
          }

          await referringUser.save();
        } else {
          console.error('Referring user not found');
        }
      }
    } else {
      // If the user already exists, add "levelUp" and "tap" to the boosters array if it's a new day
      const lastLoginDate = new Date(user.lastLogin);
      const lastLoginDay = lastLoginDate.getUTCDate();
      const lastLoginMonth = lastLoginDate.getUTCMonth();
      const lastLoginYear = lastLoginDate.getUTCFullYear();

      if (currentYear > lastLoginYear || currentMonth > lastLoginMonth || currentDay > lastLoginDay) {
        user.boosters.push("levelUp", "tap");
      }

      user.lastLogin = currentDate; // Update the last login time
      await user.save();
    }

    res.status(201).json({
      message: `User logged in successfully`,
      user,
    });
  } catch (err) {
    next(err);
  }
};





module.exports = { login };


