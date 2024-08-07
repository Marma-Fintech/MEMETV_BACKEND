const User = require("../models/userModel");
require("dotenv").config();
const loginStreakReward = [100, 200, 400, 800, 1600, 3200, 6400];
const watchStreakReward = [100, 200, 400, 800, 1600, 3200, 6400];
const referStreakReward = [1000, 2000, 3000, 5000, 10000, 15000, 25000];
const taskStreakReward = [100, 200, 400, 800, 1600, 3200, 6400];

const multiStreakReward = [2100, 4200, 8400, 16800, 33600, 67200];
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
  const currentMonth = currentDate.getUTCMonth();
  const currentYear = currentDate.getUTCFullYear();
  const lastLoginDay = lastLoginDate.getUTCDate();
  const lastLoginStreakDate = user.streak.loginStreak.loginStreakDate;
  const lastLoginStreakDay = lastLoginStreakDate.getUTCDate();
  const lastLoginStreakMonth = lastLoginStreakDate.getUTCMonth();
  const lastLoginStreakYear = lastLoginStreakDate.getUTCFullYear();
  if (lastLoginDay != currentDay) {
    console.log("User need to login first");
    return false;
  }
  if (
    currentYear > lastLoginStreakYear ||
    currentMonth > lastLoginStreakMonth ||
    currentDay > lastLoginStreakDay ||
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
    for (i = 0; i < user.streak.loginStreak.loginStreakCount; i++) {
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
        for (i = 0; i < user.streak.watchStreak.watchStreakCount; i++) {
          user.boosters.push("3X");
        }
        return true;
      } else {
        console.log("Already in a Watch Streak");
        // same day login and no WATCH STREAKreward will be claimed
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
        let refDay = refUsers[i].createdAt.getUTCDate();
        if (refDay == lastRefDay) {
          continue;
        } else if (refDay + 1 == currentDate) {
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
          (isOnReferStreak && user.streak.referStreak.referStreakCount === 7) ||
          (differenceInDays % 7) + 1 === 1
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
        } else {
          user.streak.referStreak.referStreakCount++;
          user.streak.referStreak.referStreakDate = new Date();
        }
      } else {
        return false;
      }

      const rewardAmount =
        referStreakReward[user.streak.referStreak.referStreakCount - 1];
      //add rewards to watch streak rewards
      user.streak.referStreak.referStreakReward[
        user.streak.referStreak.referStreakCount - 1
      ] = rewardAmount;
      for (i = 0; i < user.streak.referStreak.referStreakCount; i++) {
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
      if (
        user.streak.taskStreak.taskStreakCount === 7 ||
        (await calculateDayDifference(
          user.streak.watchStreak.watchStreakDate
        )) > 1 ||
        (differenceInDays % 7) + 1 === 1
      ) {
        user.streak.taskStreak.taskStreakCount = 1;
        user.streak.taskStreak.taskStreakDate = new Date();
        for (i = 0; i < user.streak.taskStreak.taskStreakReward.length; i++) {
          user.streak.taskStreak.unClaimedTaskStreakReward +=
            user.streak.taskStreak.taskStreakReward[i];
          user.streak.taskStreak.taskStreakReward[i];
        }
      } else {
        user.streak.taskStreak.taskStreakCount++;
        user.streak.taskStreak.taskStreakDate = new Date();
      }
    }
    const rewardAmount =
      taskStreakReward[user.streak.taskStreak.taskStreakCount - 1];
    //add rewards to watch streak rewards
    user.streak.taskStreak.taskStreakReward[
      user.streak.taskStreak.taskStreakCount - 1
    ] = rewardAmount;
    for (i = 0; i < user.streak.taskStreak.taskStreakCount; i++) {
      user.boosters.push("3X");
    }
    return true;
  } else {
    return false;
  }
};
const streak = async (req, res, next) => {
  try {
    const { telegramId, userWatchSeconds, boosterPoints = 0 } = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    // console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const lastLoginTime = user.lastLogin;
    let currentDate = new Date();
    if (currentDate >= distributionEndDate) {
      console.log("Distribution Completed");
      res.status(400).json({ message: "Distribution Complete" });
    }
    const currentDay = currentDate.toISOString().split("T")[0];
    currentDate = new Date(currentDay);
    // Calculate the difference in milliseconds
    const differenceInTime =
      currentDate.getTime() - distributionStartDate.getTime();
    // Convert the difference from milliseconds to days
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    console.log(differenceInDays);
    //bool to find out whether the user has logged in today
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

    const todaysLogin =
      (await user.streak.loginStreak.loginStreakDate
        .toISOString()
        .split("T")[0]) == currentDay;
    const todaysWatch =
      (await user.streak.watchStreak.watchStreakDate
        .toISOString()
        .split("T")[0]) == currentDay;
    const todaysRefer =
      (await user.streak.referStreak.referStreakDate
        .toISOString()
        .split("T")[0]) == currentDay;
    const todaysTask =
      (await user.streak.taskStreak.taskStreakDate
        .toISOString()
        .split("T")[0]) == currentDay;

    const multiStreak = await calculateMultiStreak(
      user,
      todaysLogin,
      todaysWatch,
      todaysRefer,
      todaysTask,
      differenceInDays
    );
    await user.save();
    res.status(200).json({
      message: "Streak rewards updated successfully",
      name: user.name,
      telegramId: user.telegramId,
      refId: user.refId,
      referredById: user.referredById,
      totalRewards: user.totalRewards,
      dailyRewards: user.dailyRewards,
      streaks: user.streak,
      lastLogin: user.lastLogin,
    });
  } catch (err) {
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
  if (
    (await calculateDayDifference(user.streak.multiStreak.multiStreakDate)) >= 1
  ) {
    if (todaysLogin) {
      if (!todaysLogin || !todaysWatch || !todaysRefer || !todaysTask) {
        user.streak.multiStreak.multiStreakCount = 0;
      } else if (
        user.streak.multiStreak.multiStreakCount == 7 ||
        (differenceInDays % 7) + 1 === 1
      ) {
        user.streak.multiStreak.multiStreakCount = 2;
        user.streak.multiStreak.multiStreakDate = new Date();
      } else {
        user.streak.multiStreak.multiStreakCount++;
        user.streak.multiStreak.multiStreakDate = new Date();
      }
      for (i = 0; i < user.streak.multiStreak.multiStreakCount; i++) {
        user.boosters.push("5X");
      }
      const rewardAmount =
        multiStreakReward[user.streak.multiStreak.multiStreakCount - 2] ===
        undefined
          ? 0
          : multiStreakReward[user.streak.multiStreak.multiStreakCount - 2];
      if (user.streak.multiStreak.multiStreakCount == 0) {
        for (i = 0; i < user.streak.multiStreak.multiStreakReward.length; i++) {
          user.streak.multiStreak.unClaimedMultiStreakReward +=
            user.streak.multiStreak.multiStreakReward[i];
          user.streak.multiStreak.multiStreakReward[i] = 0;
        }
      } else {
        user.streak.multiStreak.multiStreakReward[
          user.streak.multiStreak.multiStreakCount - 1
        ] = rewardAmount;
      }
      return true;
    } else {
      return false;
    }
  }
};

const loginStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    // console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentDate = new Date();
    if (user.streak.loginStreak.loginStreakReward != 0) {
      const rewardAmount = user.streak.loginStreak.loginStreakReward[index];
      // add to total reward of users
      user.totalRewards += rewardAmount;
      // add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = await user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );
      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards +=
          rewardAmount;
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
      }
      user.streak.loginStreak.loginStreakReward[index] = 0;
      await user.save();
      res.status(200).json({
        message: "Login Streak Rewards claimed successfully",
        loginStreak: user.streak.loginStreak,
        totalRewards: user.totalRewards,
      });
    } else {
      res
        .status(400)
        .json({ message: "User has no Login Streak rewards to claim" });
    }
  } catch (err) {
    next(err);
  }
};

const watchStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    // console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentDate = new Date();
    if (user.streak.watchStreak.watchStreakReward != 0) {
      const rewardAmount = user.streak.watchStreak.watchStreakReward[index];
      // add to total reward of users
      user.totalRewards += rewardAmount;
      // add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = await user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );
      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards +=
          rewardAmount;
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
      }
      user.streak.watchStreak.watchStreakReward[index] = 0;
      await user.save();
      res.status(200).json({
        message: "Watch Streak Rewards claimed successfully",
        watchStreak: user.streak.watchStreak,
        totalRewards: user.totalRewards,
      });
    } else {
      res
        .status(400)
        .json({ message: "User has no Watch Streak rewards to claim" });
    }
  } catch (err) {
    next(err);
  }
};

const referStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    // console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentDate = new Date();
    if (user.streak.referStreak.referStreakReward != 0) {
      const rewardAmount = user.streak.referStreak.referStreakReward[index];
      // add to total reward of users
      user.totalRewards += rewardAmount;
      // add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = await user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );
      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards +=
          rewardAmount;
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
      }
      user.streak.referStreak.referStreakReward[index] = 0;
      await user.save();
      res.status(200).json({
        message: "Refer Streak Rewards claimed successfully",
        referStreak: user.streak.watchStreak,
        totalRewards: user.totalRewards,
      });
    } else {
      res
        .status(400)
        .json({ message: "User has no Refer Streak rewards to claim" });
    }
  } catch (err) {
    next(err);
  }
};

const taskStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    // console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentDate = new Date();
    if (user.streak.taskStreak.taskStreakReward != 0) {
      const rewardAmount = user.streak.taskStreak.taskStreakReward[index];
      // add to total reward of users
      user.totalRewards += rewardAmount;
      // add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = await user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );
      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards +=
          rewardAmount;
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
      }
      user.streak.taskStreak.taskStreakReward[index] = 0;
      await user.save();
      res.status(200).json({
        message: "Task Streak Rewards claimed successfully",
        TaskStreak: user.streak.taskStreak,
        totalRewards: user.totalRewards,
      });
    } else {
      res
        .status(400)
        .json({ message: "User has no Task Streak rewards to claim" });
    }
  } catch (err) {
    next(err);
  }
};

const multiStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    // console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentDate = new Date();
    if (user.streak.multiStreak.multiStreakReward != 0) {
      const rewardAmount = user.streak.multiStreak.multiStreakReward[index];
      // add to total reward of users
      user.totalRewards += rewardAmount;
      // add to streak reward of users
      user.streakRewards += rewardAmount;

      // Check if there's already an entry for today in dailyRewards
      let dailyReward = await user.dailyRewards.find(
        (reward) =>
          reward.createdAt.toISOString().split("T")[0] ===
          currentDate.toISOString().split("T")[0]
      );
      if (dailyReward) {
        // Update the existing entry for today
        user.dailyRewards[user.dailyRewards.length - 1].totalRewards +=
          rewardAmount;
      } else {
        // Create a new entry for today
        user.dailyRewards.push({
          userId: user._id,
          telegramId: user.telegramId,
          totalRewards: rewardAmount,
          createdAt: new Date(),
        });
      }
      user.streak.multiStreak.multiStreakReward[index] = 0;
      await user.save();
      res.status(200).json({
        message: "Multi Streak Rewards claimed successfully",
        multiStreak: user.streak.multiStreak,
        totalRewards: user.totalRewards,
      });
    } else {
      res
        .status(400)
        .json({ message: "User has no Multi Streak rewards to claim" });
    }
  } catch (err) {
    next(err);
  }
};
module.exports = {
  streak,
  loginStreakRewardClaim,
  watchStreakRewardClaim,
  referStreakRewardClaim,
  taskStreakRewardClaim,
  multiStreakRewardClaim,
};
