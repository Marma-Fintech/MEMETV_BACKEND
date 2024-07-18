const User = require("../models/userModel");

const STREAK_REWARDS = [10, 20, 30, 40, 50, 60, 70];
const RESET_HOUR = 12; // 12 PM


// Function to generate a 5-character alphanumeric identifier
const generateRefId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
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
      const refId = generateRefId();
      
      // Generate random numbers for game cards
      const gameCard1 = Math.floor(Math.random() * 10000).toString();
      const gameCard2 = Math.floor(Math.random() * 10000).toString();
      const gameCard3 = Math.floor(Math.random() * 10000).toString();
      const gameCard4 = Math.floor(Math.random() * 10000).toString();
      const gameCard5 = Math.floor(Math.random() * 10000).toString();
  
      // Check if user already exists
      let user = await User.findOne({ telegramId });
  
      if (!user) {
        // Create a new user with the unique refId and game cards
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
          totalRewards: 0, // Initialize totalRewards for new users
        });
      }
  
      const now = new Date();
      const lastLogin = user.streak.lastLogin;
      const lastLoginDate = lastLogin ? new Date(lastLogin) : null;
  
      // Calculate end time for the current streak day
      let streakEndTime = null;
      if (lastLoginDate) {
        streakEndTime = new Date(lastLoginDate);
        streakEndTime.setDate(streakEndTime.getDate() + 1);
        streakEndTime.setHours(RESET_HOUR, 0, 0, 0);
      }
  
      if (!lastLogin || now > streakEndTime) {
        // Reset streak if last login is not today or if streak end time is passed
        user.streak.day = 1;
        user.streak.rewardsClaimed = false;
      } else if (now < streakEndTime) {
        // Continue streak
        if (!user.streak.rewardsClaimed) {
          user.streak.day = (user.streak.day % 7) + 1;
        }
      }
  
      if (!user.streak.rewardsClaimed) {
        // Grant reward only if not already claimed for the current day
        user.streak.rewardsClaimed = true;
        const reward = STREAK_REWARDS[user.streak.day - 1];
        user.totalRewards += reward; // Add reward to totalRewards
      }
  
      user.streak.lastLogin = now;
  
      // Save the user to the database
      await user.save();
      res.status(201).json({
        message: `User logged in successfully. Day ${user.streak.day}`,
        reward: user.totalRewards, // Return totalRewards instead of reward
        user,
      });
    } catch (err) {
      next(err);
    }
  };
  
  


  



module.exports = {
    login,
  };