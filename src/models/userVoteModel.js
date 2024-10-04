const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voteSchema = new Schema({
  telegramId: {
    type: String,
    ref: 'User', // Reference to the User model
    required: true,
  },
  votes: [{
    voteChoice: {
      type: String, // 'A' or 'B', depending on the poll options
      required: true,
      unique: true, // Ensure this is unique per telegramId
    },
    voteChoiceId: {
        type: String, 
        required: true,
        unique: true,
    },
    voteCount: {
      type: Number, // Tracks the number of votes for this choice by the user
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;


