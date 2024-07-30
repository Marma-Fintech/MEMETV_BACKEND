const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    telegramId: {
      type: String,
    },
    refId: {
      type: String,
    },
    refferedById: {
      type: String,
      default: "",
    },
    totalRewards: {
      type: Number,
      default: 500,
    },
    level: {
      type: Number,
      default: 1,
    },
    watchRewards: {
      type: Number,
      default: 0,
    },
    referRewards: {
      type: Number,
      default: 0,
    },
    levelUpRewards: {
      type: Number,
      default: 500,
    },
    gameRewards: {
      gamePoints: {
        type: Number,
        default: 0,
      },
      createdAt: {
        type: Date,
        default: 0
      },
    },
    stakingRewards:{
      type: Number,
      default: 0,
    },
    boosters: [{ type: String }],
    lastLogin: { type: Date }, // Track the last login time
    dailyRewards: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
        },
        telegramId: {
          type: String,
        },
        totalRewards: {
          type: Number,
        },
        userStaking: {
          type: Boolean,
          default: false
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    yourReferenceIds: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
          required: true,
        },
      },
    ],
    staking: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ]
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
