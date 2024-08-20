const User = require("../models/userModel");
const logger = require('../helpers/logger');
require("dotenv").config();
const loginStreakReward = [100, 200, 400, 800, 1600, 3200, 6400];
const watchStreakReward = [100, 200, 400, 800, 1600, 3200, 6400];
const referStreakReward = [1000, 2000, 3000, 5000, 10000, 15000, 25000];
const taskStreakReward = [100, 200, 400, 800, 1600, 3200, 6400];

const multiStreakReward = [1300, 2100, 4200, 8400, 16800, 33600, 67200];
let streakOfStreakCount = 0;
const distributionStartDate = new Date(process.env.DISTRIBUTION_START_DATE);
const distributionEndDate = new Date(process.env.DISTRIBUTION_END_DATE);

const calculateDayDifference = async (lastDate) => {
  let currentDate = new Date();
  const currentDay = currentDate.toISOString().split("T")[0];
  currentDate = new Date(currentDay);
  let lastDay = lastDate.toISOString().split("T")[0];
  lastDay = new Date(lastDay);
  // Calculate the difference in milliseconds
  const differenceInTime = currentDate.getTime() - lastDay.getTime();
  // Convert the difference from milliseconds to days
  const differenceInDays = differenceInTime / (1000 * 3600 * 24);
  return differenceInDays;
};


const calculateLoginStreak = async (user, lastLoginDate, differenceInDays) => {
  const currentDate = new Date();
  const currentDay = currentDate.getUTCDate();
  const lastLoginDay = lastLoginDate.getUTCDate();

  if (lastLoginDay != currentDay) {
    console.log("User need to login first");
    return false;
  }
  if ((await calculateDayDifference(user.streak.loginStreak.loginStreakDate)) >= 1 ||
    user.streak.loginStreak.loginStreakCount == 0
  ) {
    if (
      user.streak.loginStreak.loginStreakCount === 7 ||
      (await calculateDayDifference(user.streak.loginStreak.loginStreakDate)) >
        1 ||
      user.streak.loginStreak.loginStreakCount == 0 ||
      (differenceInDays % 7) + 1 === 1
    ) {
      user.streak.loginStreak.loginStreakCount = 1;
      user.streak.loginStreak.loginStreakDate = new Date();
      for (i = 0; i < user.streak.loginStreak.loginStreakReward.length; i++) {
        user.streak.loginStreak.unClaimedLoginStreakReward +=
          user.streak.loginStreak.loginStreakReward[i];
        user.streak.loginStreak.loginStreakReward[i] = 0;
      }
    } else {
      user.streak.loginStreak.loginStreakCount++;
      user.streak.loginStreak.loginStreakDate = new Date();
    }
    const rewardAmount =
      loginStreakReward[user.streak.loginStreak.loginStreakCount - 1];
    //add rewards to login streak rewards
    user.streak.loginStreak.loginStreakReward[
      user.streak.loginStreak.loginStreakCount - 1
    ] = rewardAmount;
    for(i=0 ;i<user.streak.loginStreak.loginStreakCount;i++){
      user.boosters.push("3X");
    }
    return true;
  } else {
    if (lastLoginDay == currentDay) {
      console.log("same day login");
      return true;
    } else {
      return false;
    }
  }
};

const calculateWatchStreak = async (
  user,
  userWatchSeconds,
  todaysLogin,
  differenceInDays
) => {
  // check a user has logged in today
  if (todaysLogin) {
    //user watch seconds should be greater than 3 minutes for watch streak
    if (userWatchSeconds >= 180) {
      const currentDate = new Date();
      const currentDay = currentDate.getUTCDate();
      const lastWatchStreakDate =
        user.streak.watchStreak.watchStreakDate.getUTCDate();
      // if login day is different it'll come inside the condition
      if (
        lastWatchStreakDate != currentDay ||
        user.streak.watchStreak.watchStreakCount == 0
      ) {
        if (
          user.streak.watchStreak.watchStreakCount === 7 ||
          (await calculateDayDifference(
            user.streak.watchStreak.watchStreakDate
          )) > 1 ||
          (differenceInDays % 7) + 1 === 1
        ) {
          user.streak.watchStreak.watchStreakCount = 1;
          user.streak.watchStreak.watchStreakDate = new Date();
          for (
            i = 0;
            i < user.streak.watchStreak.watchStreakReward.length;
            i++
          ) {
            user.streak.watchStreak.unClaimedWatchStreakReward +=
              user.streak.watchStreak.watchStreakReward[i];
            user.streak.watchStreak.watchStreakReward[i] = 0;
          }
        } else {
          user.streak.watchStreak.watchStreakCount++;
          user.streak.watchStreak.watchStreakDate = new Date();
        }
        const rewardAmount =
          watchStreakReward[user.streak.watchStreak.watchStreakCount - 1];
        //add rewards to watch streak rewards
        user.streak.watchStreak.watchStreakReward[
          user.streak.watchStreak.watchStreakCount - 1
        ] = rewardAmount;
        for(i=0 ;i<user.streak.watchStreak.watchStreakCount;i++){
          user.boosters.push("3X");
        }
        return true;
      } else {
        console.log("Already in a Watch Streak");
        // same day login and no WATCH STREAK reward will be claimed
        return true;
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const calculateReferStreak = async (user, todaysLogin, differenceInDays) => {
  // check a user has logged in today
  if (todaysLogin) {
    //array of referred people
    const refUsers = user.yourReferenceIds;
    let lastRefDay = 0;
    if (refUsers.length == 0) {
      lastRefDay = 0;
    } else {
      const lastRefUser = refUsers[refUsers.length - 1];
      lastRefDay = lastRefUser.createdAt.getUTCDate();
    }
    let isOnReferStreak = false;
    const currentDate = new Date();
    const currentDay = currentDate.getUTCDate();

    
    // in the same day user has referred someone
    if (lastRefDay == currentDay) {
      // for loop to check a user has already maintained a refer streak
      for (i = refUsers.length - 1; i >= 0; i--) {
        let refDay = refUsers[i].createdAt;
        if (refDay.getUTCDate() == lastRefDay) {
          continue;
        } else if ((await calculateDayDifference(
          refDay
        )) == 1) {
          isOnReferStreak = true;
          break;
        } else {
          break;
        }
      }
      const lastReferStreakDate =
        user.streak.referStreak.referStreakDate.getUTCDate();
      if (
        lastReferStreakDate != currentDay ||
        user.streak.referStreak.referStreakCount == 0
      ) {
        if (
          (isOnReferStreak && (user.streak.referStreak.referStreakCount === 7) ||
          (differenceInDays % 7) + 1 === 1)
        ) {
          user.streak.referStreak.referStreakCount = 1;
          user.streak.referStreak.referStreakDate = new Date();
          for (
            i = 0;
            i < user.streak.referStreak.referStreakReward.length;
            i++
          ) {
            user.streak.referStreak.unClaimedReferStreakReward +=
              user.streak.referStreak.referStreakReward[i];
            user.streak.referStreak.referStreakReward[i] = 0;
          }
        } else if(isOnReferStreak) {
          user.streak.referStreak.referStreakCount++;
          user.streak.referStreak.referStreakDate = new Date();
        }
        else{
          user.streak.referStreak.referStreakCount = 1;
          user.streak.referStreak.referStreakDate = new Date();
          for (
            i = 0;
            i < user.streak.referStreak.referStreakReward.length;
            i++
          ) {
            user.streak.referStreak.unClaimedReferStreakReward +=
              user.streak.referStreak.referStreakReward[i];
            user.streak.referStreak.referStreakReward[i] = 0;
          }
        }
      } else {
        console.log("Already in a Refer Streak");
        return true;
      }

      const rewardAmount =
        referStreakReward[user.streak.referStreak.referStreakCount - 1];
      //add rewards to watch streak rewards
      user.streak.referStreak.referStreakReward[
        user.streak.referStreak.referStreakCount - 1
      ] = rewardAmount;
      for(i=0 ;i<user.streak.referStreak.referStreakCount;i++){
        user.boosters.push("3X");
      }
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const calculateTaskStreak = async (user, todaysLogin, differenceInDays) => {
  // check a user has logged in today
  if (todaysLogin) {
    const currentDate = new Date();
    const currentDay = currentDate.getUTCDate();
    const lastGameDay = user.gameRewards.createdAt.toISOString().split("T")[0];
    const lastTaskStreakDay =
      user.streak.taskStreak.taskStreakDate.getUTCDate();

    if (
      lastGameDay == "1970-01-01" ||
      lastGameDay != currentDate.toISOString().split("T")[0]
    ) {
      return false;
    }
    if (
      lastTaskStreakDay != currentDay ||
      user.streak.taskStreak.taskStreakCount == 0
    ) {
      if(
        user.streak.taskStreak.taskStreakCount === 7 ||
        (await calculateDayDifference(
          user.streak.taskStreak.taskStreakDate
        )) > 1 ||
        (differenceInDays % 7) + 1 === 1
      ) {
        user.streak.taskStreak.taskStreakCount = 1;
        user.streak.taskStreak.taskStreakDate = new Date();
        for (i = 0; i < user.streak.taskStreak.taskStreakReward.length; i++) {
          user.streak.taskStreak.unClaimedTaskStreakReward +=
            user.streak.taskStreak.taskStreakReward[i];
          user.streak.taskStreak.taskStreakReward[i]=0;
        }
      } else {
        user.streak.taskStreak.taskStreakCount++;
        user.streak.taskStreak.taskStreakDate = new Date();
      }
    }
    else{
      console.log("Already in a Task Streak");
      return true;
    }
    const rewardAmount =
      taskStreakReward[user.streak.taskStreak.taskStreakCount - 1];
    //add rewards to watch streak rewards
    user.streak.taskStreak.taskStreakReward[
      user.streak.taskStreak.taskStreakCount - 1
    ] = rewardAmount;
    for(i=0 ;i<user.streak.taskStreak.taskStreakCount;i++){
      user.boosters.push("3X");
    }
    return true;
  } else {
    return false;
  }
};

//function to calculate streaks(login, watch, refer, task)
const streak = async (req, res, next) => {
  try {
    const { telegramId, userWatchSeconds } = req.body;

    // Log the incoming request
    logger.info(`Received request to update streak for telegramId: ${telegramId}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const lastLoginTime = user.lastLogin;
    let currentDate = new Date();
    
    if (currentDate >= distributionEndDate) {
      logger.info("Distribution period has completed");
      return res.status(400).json({ message: "Distribution Complete" });
    }

    const currentDay = currentDate.toISOString().split("T")[0];
    currentDate = new Date(currentDay);

    // Calculate the difference in milliseconds
    const differenceInTime =
      currentDate.getTime() - distributionStartDate.getTime();
    // Convert the difference from milliseconds to days
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);

    // Log the difference in days
    logger.info(`Difference in days since distribution start: ${differenceInDays}`);

    // Calculate streaks
    const login = await calculateLoginStreak(
      user,
      lastLoginTime,
      differenceInDays
    );
    const watch = await calculateWatchStreak(
      user,
      userWatchSeconds,
      login,
      differenceInDays
    );
    const refer = await calculateReferStreak(user, login, differenceInDays);
    const task = await calculateTaskStreak(user, login, differenceInDays);

    // Save user data
    await user.save();

    // Log successful update
    logger.info(`Streak rewards updated successfully for telegramId: ${telegramId}`);

    res.status(200).json({
      message: "Streak rewards updated successfully",
      name: user.name,
      telegramId: user.telegramId,
      loginStreak: user.streak.loginStreak,
      watchStreak: user.streak.watchStreak,
      referStreak: user.streak.referStreak,
      taskStreak: user.streak.taskStreak
    });
  } catch (err) {
    // Log the error
    logger.error(`Error updating streak for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};


const calculateMultiStreak = async (
  user,
  todaysLogin,
  todaysWatch,
  todaysRefer,
  todaysTask,
  differenceInDays
) => {
  if(todaysLogin){
      if ((await calculateDayDifference(user.streak.multiStreak.multiStreakDate)) != 0 || user.streak.multiStreak.multiStreakCount == 0) {
        if (await calculateDayDifference(user.streak.multiStreak.multiStreakDate)>1){
          console.log("inside");
          for (i = 0; i < user.streak.multiStreak.multiStreakReward.length; i++) {
            user.streak.multiStreak.unClaimedMultiStreakReward +=
              user.streak.multiStreak.multiStreakReward[i];
            user.streak.multiStreak.multiStreakReward[i] = 0;
          }
          user.streak.multiStreak.multiStreakCount = 1;
          streakOfStreakCount=0;
        } else if (
          user.streak.multiStreak.multiStreakCount == 7 ||
          (differenceInDays % 7) + 1 === 1
        ){
          for (i = 0; i < user.streak.multiStreak.multiStreakReward.length; i++) {
            user.streak.multiStreak.unClaimedMultiStreakReward +=
              user.streak.multiStreak.multiStreakReward[i];
            user.streak.multiStreak.multiStreakReward[i] = 0;
          }
          streakOfStreakCount++;
          user.streak.multiStreak.multiStreakCount = 1;
          user.streak.multiStreak.multiStreakDate = new Date();
  
        } else {
          user.streak.multiStreak.multiStreakCount++;
          streakOfStreakCount++;
          user.streak.multiStreak.multiStreakDate = new Date();
        }
        for(i=0 ;i<user.streak.multiStreak.multiStreakCount;i++){
          user.boosters.push("5X");
        }
        const rewardAmount =
          multiStreakReward[user.streak.multiStreak.multiStreakCount-1];
        //add rewards to multi streak rewards
        user.streak.multiStreak.multiStreakReward[
          user.streak.multiStreak.multiStreakCount - 1
        ] = rewardAmount;
        console.log("streak of streak count", streakOfStreakCount);
        if(streakOfStreakCount>1){
          const previousSOSRewards = user.streak.multiStreak.streakOfStreakRewards.length==0?0:user.streak.multiStreak.streakOfStreakRewards[user.streak.multiStreak.streakOfStreakRewards.length-1];
          user.streak.multiStreak.streakOfStreakRewards.push(previousSOSRewards+rewardAmount);
        }
        else if(streakOfStreakCount==0){
          for(i=0;i<user.streak.multiStreak.streakOfStreakRewards.length;i++){
            user.streak.multiStreak.unClaimedStreakOfStreakRewards = Number(user.streak.multiStreak.unClaimedStreakOfStreakRewards) + Number(user.streak.multiStreak.streakOfStreakRewards[i]);
            user.streak.multiStreak.streakOfStreakRewards[i]=0;
          }
        }
        return true;
      }
      else{
        console.log("Already in a Multi Streak");
        return true;
      }
    }
};

//function to calculate streak of streaks(multi and sos)
const streakOfStreak = async (req, res, next) => {
  try {
    const { telegramId } = req.body;

    // Log the incoming request
    logger.info(`Received request to update streak of streak for telegramId: ${telegramId}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const lastLoginTime = user.lastLogin;
    let currentDate = new Date();
    
    if (currentDate >= distributionEndDate) {
      logger.info("Distribution period has completed");
      return res.status(400).json({ message: "Distribution Complete" });
    }

    const currentDay = currentDate.toISOString().split("T")[0];
    currentDate = new Date(currentDay);

    // Calculate the difference in milliseconds
    const differenceInTime = currentDate.getTime() - distributionStartDate.getTime();
    // Convert the difference from milliseconds to days
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);

    // Check if the user has logged in, watched, referred, and completed tasks today
    const todaysLogin = (user.streak.loginStreak.loginStreakDate.toISOString().split("T")[0]) === currentDay;
    const todaysWatch = (user.streak.watchStreak.watchStreakDate.toISOString().split("T")[0]) === currentDay;
    const todaysRefer = (user.streak.referStreak.referStreakDate.toISOString().split("T")[0]) === currentDay;
    const todaysTask = (user.streak.taskStreak.taskStreakDate.toISOString().split("T")[0]) === currentDay;

    // Log the streak check results
    logger.info(`Today's login streak: ${todaysLogin}`);
    logger.info(`Today's watch streak: ${todaysWatch}`);
    logger.info(`Today's refer streak: ${todaysRefer}`);
    logger.info(`Today's task streak: ${todaysTask}`);

    if (todaysLogin && todaysWatch && todaysRefer && todaysTask) {
      // Calculate the multi-streak rewards
      const multiStreak = await calculateMultiStreak(
        user,
        todaysLogin,
        todaysWatch,
        todaysRefer,
        todaysTask,
        differenceInDays
      );

      // Log successful streak of streak calculation
      logger.info(`Streak of streak rewards updated successfully for telegramId: ${telegramId}`);

      // Save user data
      await user.save();

      res.status(200).json({
        message: "Streak of Streak rewards updated successfully",
        name: user.name,
        telegramId: user.telegramId,
        streakOfStreak: user.streak.multiStreak
      });
    } else {
      logger.warn(`User with telegramId: ${telegramId} has not completed all streaks today`);
      await user.save();
      res.status(400).json({ message: "User has not completed all streaks" });
    }
  } catch (err) {
    // Log the error
    logger.error(`Error updating streak of streak for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};


const loginStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;

    // Log the incoming request
    logger.info(`Received request to claim login streak reward for telegramId: ${telegramId}, index: ${index}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();

    if (user.streak.loginStreak.loginStreakReward[index] !== 0) {
      const rewardAmount = user.streak.loginStreak.loginStreakReward[index];

      // Log the reward claim details
      logger.info(`Claiming reward of ${rewardAmount} for user ${telegramId} on index ${index}`);

      // Add to total reward of users
      user.totalRewards += rewardAmount;
      // Add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );

      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
        logger.info(`Updated daily reward for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
        logger.info(`Created new daily reward entry for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      }

      // Reset the reward at the given index
      user.streak.loginStreak.loginStreakReward[index] = 0;
      await user.save();

      res.status(200).json({
        message: "Login Streak Rewards claimed successfully",
        loginStreak: user.streak.loginStreak,
        totalRewards: user.totalRewards,
      });

      // Log successful reward claim
      logger.info(`Login streak rewards successfully claimed for ${telegramId}`);
    } else {
      res.status(400).json({ message: "User has no Login Streak rewards to claim" });
      // Log case where there are no rewards to claim
      logger.warn(`User ${telegramId} has no login streak rewards to claim`);
    }
  } catch (err) {
    // Log the error
    logger.error(`Error claiming login streak reward for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};

const watchStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;

    // Log the incoming request
    logger.info(`Received request to claim watch streak reward for telegramId: ${telegramId}, index: ${index}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();

    if (user.streak.watchStreak.watchStreakReward[index] !== 0) {
      const rewardAmount = user.streak.watchStreak.watchStreakReward[index];

      // Log the reward claim details
      logger.info(`Claiming reward of ${rewardAmount} for user ${telegramId} on index ${index}`);

      // Add to total reward of users
      user.totalRewards += rewardAmount;
      // Add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );

      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
        logger.info(`Updated daily reward for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
        logger.info(`Created new daily reward entry for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      }

      // Reset the reward at the given index
      user.streak.watchStreak.watchStreakReward[index] = 0;
      await user.save();

      res.status(200).json({
        message: "Watch Streak Rewards claimed successfully",
        watchStreak: user.streak.watchStreak,
        totalRewards: user.totalRewards,
      });

      // Log successful reward claim
      logger.info(`Watch streak rewards successfully claimed for ${telegramId}`);
    } else {
      res.status(400).json({ message: "User has no Watch Streak rewards to claim" });
      // Log case where there are no rewards to claim
      logger.warn(`User ${telegramId} has no watch streak rewards to claim`);
    }
  } catch (err) {
    // Log the error
    logger.error(`Error claiming watch streak reward for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};


const referStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;

    // Log the incoming request
    logger.info(`Received request to claim refer streak reward for telegramId: ${telegramId}, index: ${index}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();

    if (user.streak.referStreak.referStreakReward[index] !== 0) {
      const rewardAmount = user.streak.referStreak.referStreakReward[index];

      // Log the reward claim details
      logger.info(`Claiming reward of ${rewardAmount} for user ${telegramId} on index ${index}`);

      // Add to total reward of users
      user.totalRewards += rewardAmount;
      // Add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );

      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
        logger.info(`Updated daily reward for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
        logger.info(`Created new daily reward entry for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      }

      // Reset the reward at the given index
      user.streak.referStreak.referStreakReward[index] = 0;
      await user.save();

      res.status(200).json({
        message: "Refer Streak Rewards claimed successfully",
        referStreak: user.streak.referStreak,
        totalRewards: user.totalRewards,
      });

      // Log successful reward claim
      logger.info(`Refer streak rewards successfully claimed for ${telegramId}`);
    } else {
      res.status(400).json({ message: "User has no Refer Streak rewards to claim" });
      // Log case where there are no rewards to claim
      logger.warn(`User ${telegramId} has no refer streak rewards to claim`);
    }
  } catch (err) {
    // Log the error
    logger.error(`Error claiming refer streak reward for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};

const taskStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;

    // Log the incoming request
    logger.info(`Received request to claim task streak reward for telegramId: ${telegramId}, index: ${index}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();

    if (user.streak.taskStreak.taskStreakReward[index] !== 0) {
      const rewardAmount = user.streak.taskStreak.taskStreakReward[index];

      // Log the reward claim details
      logger.info(`Claiming reward of ${rewardAmount} for user ${telegramId} on index ${index}`);

      // Add to total reward of users
      user.totalRewards += rewardAmount;
      // Add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );

      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
        logger.info(`Updated daily reward for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
        logger.info(`Created new daily reward entry for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      }

      // Reset the reward at the given index
      user.streak.taskStreak.taskStreakReward[index] = 0;
      await user.save();

      res.status(200).json({
        message: "Task Streak Rewards claimed successfully",
        taskStreak: user.streak.taskStreak,
        totalRewards: user.totalRewards,
      });

      // Log successful reward claim
      logger.info(`Task streak rewards successfully claimed for ${telegramId}`);
    } else {
      res.status(400).json({ message: "User has no Task Streak rewards to claim" });
      // Log case where there are no rewards to claim
      logger.warn(`User ${telegramId} has no task streak rewards to claim`);
    }
  } catch (err) {
    // Log the error
    logger.error(`Error claiming task streak reward for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};

const multiStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;

    // Log the incoming request
    logger.info(`Received request to claim multi streak reward for telegramId: ${telegramId}, index: ${index}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();

    if (user.streak.multiStreak.multiStreakReward[index] !== 0) {
      const rewardAmount = user.streak.multiStreak.multiStreakReward[index];

      // Log the reward claim details
      logger.info(`Claiming reward of ${rewardAmount} for user ${telegramId} on index ${index}`);

      // Add to total reward of users
      user.totalRewards += rewardAmount;
      // Add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );

      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
        logger.info(`Updated daily reward for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
        logger.info(`Created new daily reward entry for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      }

      // Reset the reward at the given index
      user.streak.multiStreak.multiStreakReward[index] = 0;
      await user.save();

      res.status(200).json({
        message: "Multi Streak Rewards claimed successfully",
        multiStreak: user.streak.multiStreak,
        totalRewards: user.totalRewards,
      });

      // Log successful reward claim
      logger.info(`Multi streak rewards successfully claimed for ${telegramId}`);
    } else {
      res.status(400).json({ message: "User has no Multi Streak rewards to claim" });
      // Log case where there are no rewards to claim
      logger.warn(`User ${telegramId} has no multi streak rewards to claim`);
    }
  } catch (err) {
    // Log the error
    logger.error(`Error claiming multi streak reward for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};

const streakOfStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;

    // Log the incoming request
    logger.info(`Received request to claim Streak of Streak reward for telegramId: ${telegramId}, index: ${index}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();

    if (user.streak.multiStreak.streakOfStreakRewards[index] !== 0) {
      const rewardAmount = user.streak.multiStreak.streakOfStreakRewards[index];

      // Log the reward claim details
      logger.info(`Claiming reward of ${rewardAmount} for user ${telegramId} on index ${index}`);

      // Add to total reward of users
      user.totalRewards += rewardAmount;
      // Add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );

      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
        logger.info(`Updated daily reward for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
        logger.info(`Created new daily reward entry for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      }

      // Reset the reward at the given index
      user.streak.multiStreak.streakOfStreakRewards[index] = 0;
      await user.save();

      res.status(200).json({
        message: "Streak of Streak Rewards claimed successfully",
        multiStreak: user.streak.multiStreak,
        totalRewards: user.totalRewards,
      });

      // Log successful reward claim
      logger.info(`Streak of Streak rewards successfully claimed for ${telegramId}`);
    } else {
      res.status(400).json({ message: "User has no Streak of Streak rewards to claim" });
      // Log case where there are no rewards to claim
      logger.warn(`User ${telegramId} has no Streak of Streak rewards to claim`);
    }
  } catch (err) {
    // Log the error
    logger.error(`Error claiming Streak of Streak reward for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};


const unClaimedStreakRewardsClaim = async (req, res, next) => {
  try {
    const { telegramId } = req.body;

    // Log the incoming request
    logger.info(`Received request to claim unclaimed streak rewards for telegramId: ${telegramId}`);

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      logger.warn(`User with telegramId: ${telegramId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();
    const unClaimedLoginReward = Number(user.streak.loginStreak.unClaimedLoginStreakReward);
    const unClaimedWatchReward = Number(user.streak.watchStreak.unClaimedWatchStreakReward);
    const unClaimedReferReward = Number(user.streak.referStreak.unClaimedReferStreakReward);
    const unClaimedTaskReward = Number(user.streak.taskStreak.unClaimedTaskStreakReward);
    const unClaimedMultiReward = Number(user.streak.multiStreak.unClaimedMultiStreakReward);
    const unClaimedSOSReward = Number(user.streak.multiStreak.unClaimedStreakOfStreakRewards);

    if (unClaimedLoginReward !== 0 || unClaimedWatchReward !== 0 || unClaimedReferReward !== 0 || unClaimedTaskReward !== 0 || unClaimedMultiReward !== 0 || unClaimedSOSReward !== 0) {
      const rewardAmount = unClaimedLoginReward + unClaimedWatchReward + unClaimedReferReward + unClaimedTaskReward + unClaimedMultiReward + unClaimedSOSReward;

      // Log the total reward amount being claimed
      logger.info(`Claiming total unclaimed rewards of ${rewardAmount} for user ${telegramId}`);

      // Add to total reward of users
      user.totalRewards += rewardAmount;
      // Add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );

      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards += rewardAmount;
        logger.info(`Updated daily reward for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
        logger.info(`Created new daily reward entry for ${telegramId} on ${currentDate.toISOString().split("T")[0]}`);
      }

      // Reset unclaimed rewards
      user.streak.loginStreak.unClaimedLoginStreakReward = 0;
      user.streak.watchStreak.unClaimedWatchStreakReward = 0;
      user.streak.referStreak.unClaimedReferStreakReward = 0;
      user.streak.taskStreak.unClaimedTaskStreakReward = 0;
      user.streak.multiStreak.unClaimedMultiStreakReward = 0;
      user.streak.multiStreak.unClaimedStreakOfStreakRewards = 0;

      await user.save();

      res.status(200).json({
        message: "All Unclaimed Streak Rewards claimed successfully",
        totalRewards: user.totalRewards,
        streakRewards: user.streakRewards,
        unClaimedLoginReward: user.streak.loginStreak.unClaimedLoginStreakReward,
        unClaimedWatchReward: user.streak.watchStreak.unClaimedWatchStreakReward,
        unClaimedReferReward: user.streak.referStreak.unClaimedReferStreakReward,
        unClaimedTaskReward: user.streak.taskStreak.unClaimedTaskStreakReward,
        unClaimedMultiReward: user.streak.multiStreak.unClaimedMultiStreakReward,
        unClaimedSOSReward: user.streak.multiStreak.unClaimedStreakOfStreakRewards,
      });

      // Log successful claiming of unclaimed rewards
      logger.info(`Unclaimed streak rewards successfully claimed for ${telegramId}`);
    } else {
      res.status(400).json({ message: "User has no Unclaimed Streak rewards to claim" });
      // Log case where there are no rewards to claim
      logger.warn(`User ${telegramId} has no unclaimed streak rewards to claim`);
    }
  } catch (err) {
    // Log the error
    logger.error(`Error claiming unclaimed streak rewards for telegramId: ${telegramId} - ${err.message}`);
    next(err);
  }
};

module.exports = {
  streak,
  streakOfStreak,
  loginStreakRewardClaim,
  watchStreakRewardClaim,
  referStreakRewardClaim,
  taskStreakRewardClaim,
  multiStreakRewardClaim,
  streakOfStreakRewardClaim,
  unClaimedStreakRewardsClaim
};

