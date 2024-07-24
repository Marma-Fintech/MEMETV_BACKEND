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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
