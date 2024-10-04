const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voteSchema = new Schema({
  votes: [{
    voteChoice: {
      type: String,
      required: true,
    },
    voteChoiceId: {
      type: String,
      required: true,
    },
    voters: [{ // Changed to 'voters' for clarity
      telegramId: {
        type: String, // Individual telegramId of the voter
        required: true,
      },
      voteCount: {
        type: Number, // Tracks the number of votes for this choice by this user
        default: 1, // Default to 1 since they are voting
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;

