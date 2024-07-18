const mongoose = require("mongoose");

const streakSchema = mongoose.Schema({
  day: {
    type: Number,
    default: 1,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  rewardsClaimed: {
    type: Boolean,
    default: false,
  }
});

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
      default: ""
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
    boosters: [
        {
            boosterType: {
              type: "String",
              default: "levelup"
            },
            validity: {
                type: Date 
            }
          },  
        ],
    streak: {
      type: streakSchema,
      default: () => ({}),
    },
    totalRewards: {
        type: Number,
      }
  },

  {
    timestamps: true
  }
);

const User = mongoose.model("Users", userSchema);

module.exports = User;

