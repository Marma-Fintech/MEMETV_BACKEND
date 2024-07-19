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
      type: String,
    },
    gameCard2: {
      type: String,
    },
    gameCard3: {
      type: String,
    },
    gameCard4: {
      type: String,
    },
    gameCard5: {
      type: String,
    },
    totalRewards: {
      type: Number,
      default: 500,
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
