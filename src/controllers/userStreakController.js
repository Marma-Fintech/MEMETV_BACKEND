const User = require("../models/userModel");
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

//function to check start date in a week
const checkStartDay = async (user)=>{
  //will calculate day difference between curent date and distribution end
  const res = Math.abs(await calculateDayDifference(distributionEndDate))+1;
  if(res%7==0){
    user.streak.startDay = 1;
  }
  else if(res%7==6){
    user.streak.startDay = 2;
  }
  else if(res%7==5){
    user.streak.startDay= 3;
  }
  else if(res%7==4){
    user.streak.startDay = 4;
  }
  else if(res%7==3){
    user.streak.startDay = 5;
  }
  else if(res%7==2){
    user.streak.startDay= 6;
  }
  else if(res%7==1){
    user.streak.startDay= 7;
  }
  return user.streak.startDay;
}

const updateClaimedDayArray = (user,firstLogin)=>{
  if(firstLogin){
    const startDay = user.streak.startDay;
    for(i=0;i<startDay-1;i++){

      user.streak.claimedLoginDays[i]=true;
      user.streak.claimedWatchDays[i]=true;
      user.streak.claimedReferDays[i]=true;
      user.streak.claimedTaskDays[i]=true;
      user.streak.claimedMultiDays[i]=true;
    }
  }
}

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
      (differenceInDays % 7) + 1 === 7
    ) {
      user.streak.loginStreak.loginStreakCount = 1;
      user.streak.loginStreak.loginStreakDate = new Date();
      for (i = 0; i < user.streak.loginStreak.loginStreakReward.length; i++) {
        user.streak.loginStreak.unClaimedLoginStreakReward +=
          user.streak.loginStreak.loginStreakReward[i];
        user.streak.loginStreak.loginStreakReward[i] = 0;
      }
      // Update all elements in the claimedLoginDays array to false
      user.streak.claimedLoginDays = [false, false, false, false, false, false, false];
      user.streak.claimedWatchDays = [false, false, false, false, false, false, false];
      user.streak.claimedReferDays = [false, false, false, false, false, false, false];
      user.streak.claimedTaskDays = [false, false, false, false, false, false, false];
      user.streak.claimedMultiDays = [false, false, false, false, false, false, false];
      unClaimedStreakRewardsClaim(user);
      const startDay = await checkStartDay(user);
    }
    else if((await calculateDayDifference(user.streak.loginStreak.loginStreakDate)) > 1){
      const loginDayDifference = await calculateDayDifference(user.streak.loginStreak.loginStreakDate);
      for(i=0;i<loginDayDifference;i++){
        if(((differenceInDays+i)%7)+1 === 7){
          unClaimedStreakRewardsClaim(user);
          user.streak.claimedLoginDays = [false, false, false, false, false, false, false];
          user.streak.claimedWatchDays = [false, false, false, false, false, false, false];
          user.streak.claimedReferDays = [false, false, false, false, false, false, false];
          user.streak.claimedTaskDays = [false, false, false, false, false, false, false];
          user.streak.claimedMultiDays = [false, false, false, false, false, false, false];
        }
      }
      user.streak.loginStreak.loginStreakCount = 1;
      //update claimedLoginDays bool array
      
      const startDay = await checkStartDay(user);
      const loginStreakDayDifference = await calculateDayDifference(user.streak.loginStreak.loginStreakDate);
      if(loginStreakDayDifference<=7){
        if(startDay>1){
          for(i=0;i<loginStreakDayDifference-1;i++){
            if(startDay-(i+2)>=0){
              user.streak.claimedLoginDays[startDay-(i+2)]=true;
              user.streak.claimedWatchDays[startDay-(i+2)]=true;
              user.streak.claimedReferDays[startDay-(i+2)]=true;
              user.streak.claimedTaskDays[startDay-(i+2)]=true;
              user.streak.claimedMultiDays[startDay-(i+2)]=true;
            }
          }
        }
      }
      user.streak.loginStreak.loginStreakDate = new Date();
      for (i = 0; i < user.streak.loginStreak.loginStreakReward.length; i++) {
        user.streak.loginStreak.unClaimedLoginStreakReward +=
          user.streak.loginStreak.loginStreakReward[i];
        user.streak.loginStreak.loginStreakReward[i] = 0;
      }
    } else {
      if(user.streak.loginStreak.loginStreakCount == 0){
        const startDay = await checkStartDay(user);
        updateClaimedDayArray(user,true);
      }
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
          (differenceInDays % 7) + 1 === 7
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
          // Update all elements in the claimedWatchDays array to false
          user.streak.claimedWatchDays = [false, false, false, false, false, false, false];
          unClaimedStreakRewardsClaim(user);
        } 
        else if((await calculateDayDifference(user.streak.watchStreak.watchStreakDate)) > 1 )
        {
          const watchDayDifference = await calculateDayDifference(user.streak.watchStreak.watchStreakDate);
          for(i=0;i<watchDayDifference;i++){
            if(((differenceInDays+i)%7)+1 === 7){
              unClaimedStreakRewardsClaim(user);
            }
          }
          user.streak.watchStreak.watchStreakCount = 1;
          //update claimedWatchDays bool array
          const startDay = user.streak.startDay;
          const watchStreakDayDifference = await calculateDayDifference(user.streak.watchStreak.watchStreakDate);
          if(watchStreakDayDifference<=7){
            if(startDay>1){
              for(i=0;i<watchStreakDayDifference-1;i++){
                if(startDay-(i+2)>=0){
                  user.streak.claimedWatchDays[startDay-(i+2)]=true;
                }
              }
            }
          }
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
        }
        else {
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
          (differenceInDays % 7) + 1 === 7)
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
          // Update all elements in the claimedReferDays array to false
          user.streak.claimedReferDays = [false, false, false, false, false, false, false];
          unClaimedStreakRewardsClaim(user);
        } else if(isOnReferStreak) {
          user.streak.referStreak.referStreakCount++;
          user.streak.referStreak.referStreakDate = new Date();
        }
        else{
          const referDayDifference = await calculateDayDifference(user.streak.referStreak.referStreakDate);
          for(i=0;i<referDayDifference;i++){
            if(((differenceInDays+i)%7)+1 === 7){
              unClaimedStreakRewardsClaim(user);
            }
          }
          user.streak.referStreak.referStreakCount = 1;
          //update claimedReferDays bool array
          const startDay = user.streak.startDay;
          const referStreakDayDifference = await calculateDayDifference(user.streak.referStreak.referStreakDate);
          if(referStreakDayDifference<=7){
            if(startDay>1){
              for(i=0;i<referStreakDayDifference-1;i++){
                if(startDay-(i+2)>=0){
                  user.streak.claimedReferDays[startDay-(i+2)]=true;
                }
              }
            }
          }
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
        user.streak.taskStreak.taskStreakCount === 7  ||
        (differenceInDays % 7) + 1 === 7
      ) {
        user.streak.taskStreak.taskStreakCount = 1;
        user.streak.taskStreak.taskStreakDate = new Date();
        for (i = 0; i < user.streak.taskStreak.taskStreakReward.length; i++) {
          user.streak.taskStreak.unClaimedTaskStreakReward +=
            user.streak.taskStreak.taskStreakReward[i];
          user.streak.taskStreak.taskStreakReward[i]=0;
        }
        // Update all elements in the claimedTaskDays array to false
        user.streak.claimedTaskDays = [false, false, false, false, false, false, false];
        unClaimedStreakRewardsClaim(user);
      }
      else if((await calculateDayDifference(user.streak.taskStreak.taskStreakDate)) > 1){
        const taskDayDifference = await calculateDayDifference(user.streak.taskStreak.taskStreakDate);
        for(i=0;i<taskDayDifference;i++){
          if(((differenceInDays+i)%7)+1 === 7){
            unClaimedStreakRewardsClaim(user);
          }
        }
        user.streak.taskStreak.taskStreakCount = 1;
        //update claimedTaskDays bool array
        const startDay = user.streak.startDay;
        const taskStreakDayDifference = await calculateDayDifference(user.streak.taskStreak.taskStreakDate);
        if(taskStreakDayDifference<=7){
          if(startDay>1){
            for(i=0;i<taskStreakDayDifference-1;i++){
              if(startDay-(i+2)>=0){
                user.streak.claimedTaskDays[startDay-(i+2)]=true;
              }
            }
          }
        }
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
    const { telegramId, userWatchSeconds} = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const lastLoginTime = user.lastLogin;
    let currentDate = new Date();
    const currentDay = currentDate.toISOString().split("T")[0];
    currentDate = new Date(currentDay);
    if (currentDate > distributionEndDate) {
      console.log("Distribution Completed");
      res.status(400).json({ message: "Distribution Completed" });
    }
    // Calculate the difference in milliseconds
    const differenceInTime =Math.abs(currentDate.getTime() - distributionEndDate.getTime())+1;
    // Convert the difference from milliseconds to days
    const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
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
    console.log(login, watch, refer, task);

    await user.save();
    res.status(200).json({
      message: "Streak rewards updated successfully",
      name: user.name,
      telegramId: user.telegramId,
      loginStreak: user.streak.loginStreak,
      watchStreak: user.streak.watchStreak,
      referStreak: user.streak.referStreak,
      taskStreak: user.streak.taskStreak,
      login: login,
      watch: watch,
      refer: refer,
      task: task
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
  if(todaysLogin){
      if ((await calculateDayDifference(user.streak.multiStreak.multiStreakDate)) != 0 || user.streak.multiStreak.multiStreakCount == 0) {
        if (await calculateDayDifference(user.streak.multiStreak.multiStreakDate)>1){
          const multiDayDifference = await calculateDayDifference(user.streak.multiStreak.multiStreakDate);
          for(i=0;i<multiDayDifference;i++){
            if(((differenceInDays+i)%7)+1 === 7){
              unClaimedStreakRewardsClaim(user);
            }
          }
          user.streak.multiStreak.multiStreakCount = 1;
          //update claimedMultiDays bool array
          const startDay = user.streak.startDay;
          const multiStreakDayDifference = await calculateDayDifference(user.streak.multiStreak.multiStreakDate);
          if(multiStreakDayDifference<=7){
            if(startDay>1){
              for(i=0;i<multiStreakDayDifference-1;i++){
                if(startDay-(i+2)>=0){
                  user.streak.claimedMultiDays[startDay-(i+2)]=true;
                }
              }
            }
          }
          user.streak.multiStreak.multiStreakDate = new Date();
          for (i = 0; i < user.streak.multiStreak.multiStreakReward.length; i++) {
            user.streak.multiStreak.unClaimedMultiStreakReward +=
              user.streak.multiStreak.multiStreakReward[i];
            user.streak.multiStreak.multiStreakReward[i] = 0;
          }
          streakOfStreakCount=0;
          user.streak.multiStreak.SOSCount = streakOfStreakCount;
          user.streak.multiStreak.lastSOSReward = 0;
        } else if (
          user.streak.multiStreak.multiStreakCount == 7 ||
          (differenceInDays % 7) + 1 === 7
        ){
          for (i = 0; i < user.streak.multiStreak.multiStreakReward.length; i++) {
            user.streak.multiStreak.unClaimedMultiStreakReward +=
              user.streak.multiStreak.multiStreakReward[i];
            user.streak.multiStreak.multiStreakReward[i] = 0;
          }
          streakOfStreakCount++;
          user.streak.multiStreak.SOSCount = (streakOfStreakCount-1);
          user.streak.multiStreak.multiStreakCount = 1;
          user.streak.multiStreak.multiStreakDate = new Date();
          // Update all elements in the claimedMultiDays array to false
          user.streak.claimedMultiDays = [false, false, false, false, false, false, false];
          unClaimedStreakRewardsClaim(user);
        } else {
          user.streak.multiStreak.multiStreakCount++;
          streakOfStreakCount++;
          user.streak.multiStreak.SOSCount = (streakOfStreakCount-1);
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

        // SOS reward calculation
        if(streakOfStreakCount>1){
          if(user.streak.multiStreak.streakOfStreakRewards[user.streak.multiStreak.streakOfStreakRewards.length-1]!=0){
            const previousSOSRewards = user.streak.multiStreak.streakOfStreakRewards.length==0?0:user.streak.multiStreak.streakOfStreakRewards[user.streak.multiStreak.streakOfStreakRewards.length-1];
            user.streak.multiStreak.streakOfStreakRewards.push(previousSOSRewards+rewardAmount);
          }
          else{
            user.streak.multiStreak.streakOfStreakRewards.push(user.streak.multiStreak.lastSOSReward+rewardAmount);
          }
          
        }
        else if(streakOfStreakCount==0){
          for(i=0;i<user.streak.multiStreak.streakOfStreakRewards.length;i++){
            user.streak.multiStreak.unClaimedStreakOfStreakRewards = Number(user.streak.multiStreak.unClaimedStreakOfStreakRewards) + Number(user.streak.multiStreak.streakOfStreakRewards[i]);
            user.streak.multiStreak.streakOfStreakRewards[i]=0;
          }
          unClaimedStreakRewardsClaim(user);
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
    const { telegramId} = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const lastLoginTime = user.lastLogin;
    let currentDate = new Date();
    const currentDay = currentDate.toISOString().split("T")[0];
    currentDate = new Date(currentDay);
    if (currentDate > distributionEndDate) {
      console.log("Distribution Completed");
      res.status(400).json({ message: "Distribution Completed" });
    }
    // Calculate the difference in milliseconds
    const differenceInTime =
      Math.abs(currentDate.getTime() - distributionEndDate.getTime())+1;
    // Convert the difference from milliseconds to days
    const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));

    const todaysLogin =
      ((await user.streak.loginStreak.loginStreakDate
        .toISOString()
        .split("T")[0]) == currentDay && await user.streak.loginStreak.loginStreakCount !=0);
    const todaysWatch =
      ((await user.streak.watchStreak.watchStreakDate
        .toISOString()
        .split("T")[0]) == currentDay && await user.streak.watchStreak.watchStreakCount!=0);
    const todaysRefer =
      ((await user.streak.referStreak.referStreakDate
        .toISOString()
        .split("T")[0]) == currentDay && await user.streak.referStreak.referStreakCount !=0);
    const todaysTask =
      ((await user.streak.taskStreak.taskStreakDate
        .toISOString()
        .split("T")[0]) == currentDay && user.streak.taskStreak.taskStreakCount!=0);

    if(todaysLogin && todaysWatch && todaysRefer && todaysTask){
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
        message: "Streak of Streak rewards updated successfully",
        name: user.name,
        telegramId: user.telegramId,
        streakOfStreak: user.streak.multiStreak
      });
    }
    else{
      await user.save();
      res
        .status(400)
        .json({ message: "User has not completed all streaks" });
    }
  } catch (err) {
    next(err);
  }
};



const loginStreakRewardClaim = async (req, res, next) => {
  try {
    const { telegramId, index } = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
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
      //update the claimed login streak array value
      const startDay = user.streak.startDay;
      user.streak.claimedLoginDays[index+(startDay-1)]=true;
      await user.save();
      res
        .status(200)
        .json({
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
      //update the claimed watch streak array value
      const startDay = user.streak.startDay;
      user.streak.claimedWatchDays[index+(startDay-1)]=true;
      await user.save();
      res
        .status(200)
        .json({
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
      //update the claimed Refer streak array value
      const startDay = user.streak.startDay;
      user.streak.claimedReferDays[index+(startDay-1)]=true;
      await user.save();
      res
        .status(200)
        .json({
          message: "Refer Streak Rewards claimed successfully",
          referStreak: user.streak.referStreak,
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
      //update the claimed task streak array value
      const startDay = user.streak.startDay;
      user.streak.claimedTaskDays[index+(startDay-1)]=true;
      await user.save();
      res
        .status(200)
        .json({
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
      //update the claimed multi streak array value
      const startDay = user.streak.startDay;
      user.streak.claimedMultiDays[index+(startDay-1)]=true;
      await user.save();
      res
        .status(200)
        .json({
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

const streakOfStreakRewardClaim = async (req, res, next) => {
  try {
    console.log("inside");
    const { telegramId} = req.body;
    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentDate = new Date();
    if (user.streak.multiStreak.streakOfStreakRewards != 0) {
      let rewardAmount=0;
      user.streak.multiStreak.lastSOSReward = user.streak.multiStreak.streakOfStreakRewards[user.streak.multiStreak.streakOfStreakRewards.length-1];
      for(i=0;i<user.streak.multiStreak.streakOfStreakRewards.length;i++){
        rewardAmount += user.streak.multiStreak.streakOfStreakRewards[i];
        user.streak.multiStreak.streakOfStreakRewards[i]=0;
      }
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
      await user.save();
      res
        .status(200)
        .json({
          message: "Streak of Streak Rewards claimed successfully",
          multiStreak: user.streak.multiStreak,
          totalRewards: user.totalRewards,
        });
    } else {
      res
        .status(400)
        .json({ message: "User has no Streak of Streak rewards to claim" });
    }
  } catch (err) {
    next(err);
  }
};

const unClaimedStreakRewardsClaim = async (user) => {
  try {
    const currentDate = new Date();
    const unClaimedLoginReward = Number(user.streak.loginStreak.unClaimedLoginStreakReward);
    const unClaimedWatchReward = Number(user.streak.watchStreak.unClaimedWatchStreakReward);
    const unClaimedReferReward = Number(user.streak.referStreak.unClaimedReferStreakReward);
    const unClaimedTaskReward = Number(user.streak.taskStreak.unClaimedTaskStreakReward);
    const unClaimedMultiReward = Number(user.streak.multiStreak.unClaimedMultiStreakReward);
    const unClaimedSOSReward = Number(user.streak.multiStreak.unClaimedStreakOfStreakRewards);
    if (unClaimedLoginReward !=0 || unClaimedWatchReward != 0 || unClaimedReferReward != 0 || unClaimedTaskReward !=0 || unClaimedMultiReward !=0 || unClaimedSOSReward !=0) {
      const rewardAmount = unClaimedLoginReward + unClaimedWatchReward + unClaimedReferReward + unClaimedTaskReward + unClaimedMultiReward + unClaimedSOSReward;
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
      user.streak.loginStreak.unClaimedLoginStreakReward = 0;
      user.streak.watchStreak.unClaimedWatchStreakReward = 0;
      user.streak.referStreak.unClaimedReferStreakReward = 0;
      user.streak.taskStreak.unClaimedTaskStreakReward = 0;
      user.streak.multiStreak.unClaimedMultiStreakReward = 0;
      user.streak.multiStreak.unClaimedStreakOfStreakRewards = 0;
    } else {
      
    }
  } catch (err) {
    next(err);
  }
};

// const unClaimedStreakRewardsClaim = async (req, res, next) => {
//   try {
//     const { telegramId} = req.body;
//     // Find the user by telegramId
//     const user = await User.findOne({ telegramId });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const currentDate = new Date();
//     const unClaimedLoginReward = Number(user.streak.loginStreak.unClaimedLoginStreakReward);
//     const unClaimedWatchReward = Number(user.streak.watchStreak.unClaimedWatchStreakReward);
//     const unClaimedReferReward = Number(user.streak.referStreak.unClaimedReferStreakReward);
//     const unClaimedTaskReward = Number(user.streak.taskStreak.unClaimedTaskStreakReward);
//     const unClaimedMultiReward = Number(user.streak.multiStreak.unClaimedMultiStreakReward);
//     const unClaimedSOSReward = Number(user.streak.multiStreak.unClaimedStreakOfStreakRewards);
//     if (unClaimedLoginReward !=0 || unClaimedWatchReward != 0 || unClaimedReferReward != 0 || unClaimedTaskReward !=0 || unClaimedMultiReward !=0 || unClaimedSOSReward !=0) {
//       const rewardAmount = unClaimedLoginReward + unClaimedWatchReward + unClaimedReferReward + unClaimedTaskReward + unClaimedMultiReward + unClaimedSOSReward;
//       // add to total reward of users
//       user.totalRewards += rewardAmount;
//       // add to streak reward of users
//       user.streakRewards += rewardAmount;

//       // Check if there's already an entry for today in dailyRewards
//       let dailyReward = await user.dailyRewards.find(
//         (reward) =>
//           reward.createdAt.toISOString().split("T")[0] ===
//           currentDate.toISOString().split("T")[0]
//       );
//       if (dailyReward) {
//         // Update the existing entry for today
//         user.dailyRewards[user.dailyRewards.length - 1].totalRewards +=
//           rewardAmount;
//       } else {
//         // Create a new entry for today
//         user.dailyRewards.push({
//           userId: user._id,
//           telegramId: user.telegramId,
//           totalRewards: rewardAmount,
//           createdAt: new Date(),
//         });
//       }

//       user.streak.loginStreak.unClaimedLoginStreakReward = 0;
//       user.streak.watchStreak.unClaimedWatchStreakReward = 0;
//       user.streak.referStreak.unClaimedReferStreakReward = 0;
//       user.streak.taskStreak.unClaimedTaskStreakReward = 0;
//       user.streak.multiStreak.unClaimedMultiStreakReward = 0;
//       user.streak.multiStreak.unClaimedStreakOfStreakRewards = 0;
//       await user.save();
//       res
//         .status(200)
//         .json({
//           message: "All Unclaimed Streak Rewards claimed successfully",
//           totalRewards: user.totalRewards,
//           streakRewards: user.streakRewards,
//           unClaimedLoginReward: user.streak.loginStreak.unClaimedLoginStreakReward,
//           unClaimedWatchReward: user.streak.watchStreak.unClaimedWatchStreakReward,
//           unClaimedReferReward: user.streak.referStreak.unClaimedReferStreakReward,
//           unClaimedTaskReward: user.streak.taskStreak.unClaimedTaskStreakReward,
//           unClaimedMultiReward: user.streak.multiStreak.unClaimedMultiStreakReward,
//           unClaimedSOSReward: user.streak.multiStreak.unClaimedStreakOfStreakRewards,
//         });
//     } else {
//       res
//         .status(400)
//         .json({ message: "User has no Unclaimed Streak rewards to claim" });
//     }
//   } catch (err) {
//     next(err);
//   }
// };

const updateClaimedLoginDaysArray = async (req, res, next) => {
  try {
    const { telegramId, claimedDayArray } = req.body;

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate claimedDayArray length if needed
    if (!Array.isArray(claimedDayArray) || claimedDayArray.length !== 7) {
      return res.status(400).json({ message: "Invalid claimed login array" });
    }

    // Update the claimedLoginDays array
    user.streak.claimedLoginDays = claimedDayArray;
    // Save the updated user document
    await user.save();

    // Send success response
    res.status(200).json({ message: "claimedLoginDays array updated successfully" ,
      claimedLoginDays: user.streak.claimedLoginDays
    });
  } catch (err) {
    next(err);
  }
};

const updateClaimedWatchDaysArray = async (req, res, next) => {
  try {
    const { telegramId, claimedDayArray } = req.body;

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate claimedDayArray length if needed
    if (!Array.isArray(claimedDayArray) || claimedDayArray.length !== 7) {
      return res.status(400).json({ message: "Invalid claimed watch array" });
    }

    // Update the claimedWatchDays array
    user.streak.claimedWatchDays = claimedDayArray;
    // Save the updated user document
    await user.save();

    // Send success response
    res.status(200).json({ message: "claimedWatchDays array updated successfully",
      claimedWatchDays: user.streak.claimedWatchDays });
  } catch (err) {
    next(err);
  }
};


const updateClaimedReferDaysArray = async (req, res, next) => {
  try {
    const { telegramId, claimedDayArray } = req.body;

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate claimedDayArray length if needed
    if (!Array.isArray(claimedDayArray) || claimedDayArray.length !== 7) {
      return res.status(400).json({ message: "Invalid claimed refer array" });
    }

    // Update the claimedReferDays array
    user.streak.claimedReferDays = claimedDayArray;
    // Save the updated user document
    await user.save();

    // Send success response
    res.status(200).json({ message: "claimedReferDays array updated successfully",
      claimedReferDays: user.streak.claimedReferDays });
  } catch (err) {
    next(err);
  }
};


const updateClaimedTaskDaysArray = async (req, res, next) => {
  try {
    const { telegramId, claimedDayArray } = req.body;

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate claimedDayArray length if needed
    if (!Array.isArray(claimedDayArray) || claimedDayArray.length !== 7) {
      return res.status(400).json({ message: "Invalid claimed task array" });
    }

    // Update the claimedTaskDays array
    user.streak.claimedTaskDays = claimedDayArray;
    // Save the updated user document
    await user.save();

    // Send success response
    res.status(200).json({ message: "claimedTaskDays array updated successfully" ,
      claimedTaskDays: user.streak.claimedTaskDays});
  } catch (err) {
    next(err);
  }
};


const updateClaimedMultiDaysArray = async (req, res, next) => {
  try {
    const { telegramId, claimedDayArray } = req.body;

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate claimedDayArray length if needed
    if (!Array.isArray(claimedDayArray) || claimedDayArray.length !== 7) {
      return res.status(400).json({ message: "Invalid claimed multi array" });
    }

    // Update the claimedMultiDays array
    user.streak.claimedMultiDays = claimedDayArray;
    // Save the updated user document
    await user.save();

    // Send success response
    res.status(200).json({ message: "claimedMultiDays array updated successfully",
      claimedMultiDays: user.streak.claimedMultiDays });
  } catch (err) {
    next(err);
  }
};


const userStreaks = async (req, res, next) => {
  try {
    let { telegramId } = req.params;

    // Trim leading and trailing spaces
    telegramId = telegramId.trim();

    // Find the user detail document for the given telegramId
    const user = await User.findOne({ telegramId: telegramId });

    // Check if user detail was found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user streak details in the response
    console.log(user.streak);
    return res.status(200).json(user.streak);
  } catch (error) {
    // Handle any errors that occur
    return res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
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
  updateClaimedLoginDaysArray,
  updateClaimedWatchDaysArray,
  updateClaimedReferDaysArray,
  updateClaimedTaskDaysArray,
  updateClaimedMultiDaysArray,
  userStreaks
};

