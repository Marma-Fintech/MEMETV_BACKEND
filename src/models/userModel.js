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
    gameCard1: {
      type: Number,
    },
    gameCard2: {
      type: Number,
    },
    gameCard3: {
      type: Number,
    },
    gameCard4: {
      type: Number,
    },
    gameCard5: {
      type: Number,
    },
    totalRewards: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1
    },
    yourReferenceIds: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
          required: true
        }
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
