const User = require("../models/userModel");
const loginStreakReward = [
  100,
  200,
  400,
  800,
  1600,
  3200,
  6400
];
const watchStreakReward = [
  100,
  200,
  400,
  800,
  1600,
  3200,
  6400
];
const referStreakReward = [
  1000,
  2000,
  3000,
  5000,
  10000,
  15000,
  25000,
];
const taskStreakReward = [
  100,
  200,
  400,
  800,
  1600,
  3200,
  6400
];
const calculateLoginStreak = async (user, lastLoginDate)=>{
  const currentDate = new Date();
  const currentDay = currentDate.getUTCDate();
  const currentMonth = currentDate.getUTCMonth();
  const currentYear = currentDate.getUTCFullYear();
  const lastLoginDay = lastLoginDate.getUTCDate();
  const lastLoginMonth = lastLoginDate.getUTCMonth();
  const lastLoginYear = lastLoginDate.getUTCFullYear();
  if (currentYear > lastLoginYear || currentMonth > lastLoginMonth || currentDay > lastLoginDay || user.streak.loginStreak==0){
      if(((currentDay-lastLoginDay)>1) || user.streak.loginStreak==7 || user.streak.loginStreak==0){
          user.streak.loginStreak=1;
      }
      else{
          user.streak.loginStreak++;
      }
      const rewardAmount = loginStreakReward[user.streak.loginStreak-1];
      // add to total reward of users
      user.totalRewards += rewardAmount;
      // add to streak reward of users
      user.streakRewards += rewardAmount;
      // Check if there's already an entry for today in dailyRewards
      let dailyReward = await user.dailyRewards.find(
          (reward) => reward.createdAt.toISOString().split("T")[0] === currentDate.toISOString().split("T")[0]
      );
      if (dailyReward) {
          // Update the existing entry for today
          user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
      } else {
          // Create a new entry for today
          user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
          });
      }
      return true;
  }
  else{
      if(lastLoginDay==currentDay){
          return true;
      }
      else{
          return false;
      }
  }
}
const calculateWatchStreak = async (user, lastLoginDate, userWatchSeconds,todaysLogin)=>{
  // check a user has logged in today
  if(todaysLogin)
  {
      //user watch seconds should be greater than 3 minutes for watch streak
      if(userWatchSeconds>=180){
          const currentDate = new Date();
          const currentDay = currentDate.getUTCDate();
          const lastWatchStreakDate = user.streak.watchStreak.watchStreakDate.getUTCDate();
          // if login day is different it'll come inside the condition
          if(lastWatchStreakDate  != currentDay || user.streak.watchStreak.watchStreakCount==0){
              if((!lastWatchStreakDate) || (user.streak.watchStreak.watchStreakCount ===7) || (lastWatchStreakDate+1 != currentDay)){
                  user.streak.watchStreak.watchStreakCount=1;
                  user.streak.watchStreak.watchStreakDate = new Date();
              }
              else if(lastWatchStreakDate+1 == currentDay){
                  user.streak.watchStreak.watchStreakCount++;
                  user.streak.watchStreak.watchStreakDate = new Date();
              }
              const rewardAmount = watchStreakReward[user.streak.watchStreak.watchStreakCount-1];
              // add to total reward of users
              user.totalRewards += rewardAmount;
              // add to streak reward of users
              user.streakRewards += rewardAmount;
              // add to daily reward of users
              user.dailyRewards[user.dailyRewards.length - 1].totalRewards+=rewardAmount;
              return true;
          }
          else{
              // same day login and no WATCH STREAKCreward will be claimed
              return false;
          }
      }
      else{
          return false;
      }
  }
  else{
      return false;
  }
}
const calculateReferStreak = async (user, todaysLogin)=>{
  // check a user has logged in today
  if(todaysLogin)
  {
      //array of referred people
      const refUsers = user.yourReferenceIds;
      let lastRefDay = 0;
      if(refUsers.length==0){
          lastRefDay = 0;
      }
      else{
          const lastRefUser = refUsers[refUsers.length-1];
          lastRefDay = lastRefUser.createdAt.getUTCDate();
      }
      let isOnReferStreak= false;
      const currentDate = new Date();
      const currentDay = currentDate.getUTCDate();
      // in the same day user has referred someone
      if(lastRefDay == currentDay){
          // for loop to check a user has already maintained a refer streak
          for(i=refUsers.length-1;i>=0;i--){
              let refDay = refUsers[i].createdAt.getUTCDate();
              if(refDay == lastRefDay){
                  continue;
              }
              else if(refDay+1 == currentDate){
                  isOnReferStreak=true;
                  break;
              }
              else{
                  break;
              }
          }
          if(isOnReferStreak && user.streak.referStreak.referStreakCount == 7){
              user.streak.referStreak.referStreakCount++;
              user.streak.referStreak.referStreakDate = new Date();
          }
          else if(isOnReferStreak && user.streak.referStreak.referStreakCount != 7){
              user.streak.referStreak.referStreakCount++;
              user.streak.referStreak.referStreakDate = new Date();
          }
          else{
              user.streak.referStreak.referStreakCount = 1;
              user.streak.referStreak.referStreakDate = new Date();
          }
          const rewardAmount = referStreakReward[user.streak.referStreak.referStreakCount-1];
          // add to total reward of users
          user.totalRewards += rewardAmount;
          // add to streak reward of users
          user.streakRewards += rewardAmount;
          // add to daily reward of users
          user.dailyRewards[user.dailyRewards.length - 1].totalRewards+=rewardAmount;
          return true;
      }
      else{
          return false;
      }
  }
  else{
      return false;
  }
}
const calculateTaskStreak = async (user, todaysLogin)=>{
  // check a user has logged in today
  if(todaysLogin)
  {
      const currentDate = new Date();
      const currentDay = currentDate.getUTCDate();
      const lastGameDay = user.gameRewards.createdAt.getUTCDate();
      if(lastGameDay == currentDay){
          return true;
      }
      else if(lastGameDay+1 == currentDay && user.streak.taskStreak ==7){
          user.streak.taskStreak=1;
      }
      else if(lastGameDay+1 == currentDay){
          user.streak.taskStreak++;
      }
      else{
          user.streak.taskStreak=1;
      }
      const rewardAmount = taskStreakReward[user.streak.taskStreak - 1];
      // add to total reward of users
      user.totalRewards += rewardAmount;
      // add to streak reward of users
      user.streakRewards += rewardAmount;
      // add to daily reward of users
      user.dailyRewards[user.dailyRewards.length - 1].totalRewards+=rewardAmount;
      return true;
  }
  else{
      return false;
  }
}
const streak = async (req, res, next)=>{
  try {
      const { telegramId, userWatchSeconds, boosterPoints = 0 } = req.body;
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      // console.log(user);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const lastLoginTime = user.lastLogin;
      //bool to find out whether the user has logged in today
      const todaysLogin= await calculateLoginStreak(user, lastLoginTime);
      const todaysWatch = await calculateWatchStreak(user, lastLoginTime, userWatchSeconds, todaysLogin);
      const todaysRefer = await calculateReferStreak(user, todaysLogin);
      const todaysTask = await calculateTaskStreak(user, todaysLogin);
      // calculateMultiStreak(todaysLogin,)
      await user.save();
      res.status(200).json({
          message: "Streak rewards updated successfully",
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
          yourReferenceIds:user.yourReferenceIds,
          staking: user.staking,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
  }
  catch(err){
      next(err);
  }
}
const calculateMultiStreak = async ()=>
{
}
module.exports = {streak};