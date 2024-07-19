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
    const gameCard1 = Math.floor(Math.random() * 10000).toString();
    const gameCard2 = Math.floor(Math.random() * 10000).toString();
    const gameCard3 = Math.floor(Math.random() * 10000).toString();
    const gameCard4 = Math.floor(Math.random() * 10000).toString();
    const gameCard5 = Math.floor(Math.random() * 10000).toString();

    // Check if user already exists
    let user = await User.findOne({ telegramId });

    if (!user) {
      // Initialize an array to hold reference user IDs
      let yourReferenceIds = [];

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
          await referringUser.save();
        } else {
          console.error('Referring user not found');
        }
      }
    }

    res.status(201).json({
      message: `User logged in successfully`,
      user,
    });
  } catch (err) {
    next(err);
  }
};



module.exports = {
  login,
};
