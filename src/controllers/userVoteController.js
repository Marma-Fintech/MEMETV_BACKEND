const User = require("../models/userModel");
const Vote = require("../models/userVoteModel");
const logger = require("../helpers/logger");

const userChoosePoll = async (req, res, next) => {
    const { voteChoice,voteChoiceId, telegramId } = req.body; // Get voteChoice and telegramId from request body

    try {
        // Find the user by their telegramId
        const user = await User.findOne({ telegramId });

        if (!user) {
            logger.error(`User with Telegram ID ${telegramId} not found`);
            return res.status(404).json({ message: "User not found" });
        }

        // Find the vote record for the user
        const voteRecord = await Vote.findOne({ telegramId });

        if (voteRecord) {
            // Check if the voteChoice already exists
            const existingVote = voteRecord.votes.find(vote => vote.voteChoiceId === voteChoiceId);

            if (existingVote) {
                // If the voteChoice already exists, respond with a message
                return res.status(400).json({
                    message: "VoteChoice already Choosed"
                });
            } else {
                // If the voteChoice doesn't exist, push a new voteChoice into the votes array
                voteRecord.votes.push({ voteChoice,voteChoiceId, createdAt: Date.now() }); // Add new voteChoice
                await voteRecord.save(); // Save the updated voteRecord
            }
        } else {
            // Create a new vote record if none exists
            const newVote = new Vote({
                telegramId,
                votes: [{ voteChoice,voteChoiceId, createdAt: Date.now() }] // Initialize with the first vote
            });
            await newVote.save(); // Save the new vote record
        }

        logger.info(`VoteChoice recorded for user ${telegramId}: ${voteChoice}`);

        // Prepare response with telegramId and voteChoice
        const responseVote = {
            telegramId: telegramId, // Include telegramId in the response
            voteChoice: voteChoice,  // Include the chosen vote
            voteChoiceId: voteChoiceId
        };

        // Send success response
        return res.status(200).json({
            message: "VoteChoice successfully recorded",
            vote: responseVote // Return the response vote
        });

    } catch (err) {
        logger.error("Error in userChoosePoll controller", err);
        next(err); // Pass error to the global error handler
    }
};

const calculateVotes = async (req, res, next) => {
    const { voteCount, voteChoiceId, telegramId } = req.body;

    try {
        // Find the vote record for the user by telegramId
        const voteRecord = await Vote.findOne({ telegramId });

        if (!voteRecord) {
            // If no vote record exists for the user, return a 404 error
            logger.error(`No vote record found for Telegram ID: ${telegramId}`);
            return res.status(404).json({ message: "Vote record not found for the specified user." });
        }

        // Find the vote choice in the user's vote record
        const voteChoice = voteRecord.votes.find(vote => vote.voteChoiceId === voteChoiceId);

        if (!voteChoice) {
            // If the specified voteChoiceId does not exist, return an error
            logger.error(`Vote choice ${voteChoiceId} not found for Telegram ID: ${telegramId}`);
            return res.status(404).json({ message: "Vote choice not found for the specified user." });
        }

        // Calculate the total votes for the specific vote choice
        voteChoice.voteCount += voteCount; // Update the vote count
        await voteRecord.save(); // Save the updated record

        logger.info(`Updated vote count for Telegram ID: ${telegramId}, Vote Choice: ${voteChoiceId}, New Count: ${voteChoice.voteCount}`);

        // Prepare response
        return res.status(200).json({
            message: "Vote count successfully updated.",
            voteChoiceId: voteChoiceId,
            newVoteCount: voteChoice.voteCount,
            telegramId: telegramId,
        });
    } catch (err) {
        logger.error("Error in calculateVotes controller", err);
        next(err); // Pass error to the global error handler
    }
};

module.exports = {
    userChoosePoll,
    calculateVotes
};
