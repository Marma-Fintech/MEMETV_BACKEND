const Vote = require('../models/userVoteModel');
const User = require('../models/userModel');
const logger = require('../helpers/logger'); 

const getBattleByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date query parameter is required' });
    }

    // Log the incoming request
    logger.info(`Received request for battles on date: ${date}`);

    // Try to parse the date properly
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      logger.warn(`Invalid date format received: ${date}`);
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Convert the parsed date to the start and end of the day in UTC
    const startOfDay = new Date(parsedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Query the database to get battles for the provided date
    const battles = await Vote.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // If no battles found
    if (battles.length === 0) {
      logger.warn(`No battles found for the date: ${date}`);
      return res.status(404).json({ message: 'No battles found for the given date' });
    }

    // Log successful query
    logger.info(`Battles found for date: ${date}, sending response.`);

    // Send the found battles back
    res.json(battles);
  } catch (err) {
    // Log the error
    logger.error(`Error fetching battles for date: ${date} - ${err.message}`);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



const userChooseTeam = async (req, res, next) => {
  const { teamId, telegramId } = req.body;

  try {

    // Get today's date (in UTC) to find the appropriate battle
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);  // Set to the start of the day in UTC
        
    
    // Find the vote document for today
    const vote = await Vote.findOne({ 
      date: { $gte: today, $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) } 
    });

    // If no battle is found for today, return an error
    if (!vote) {
      return res.status(404).json({ message: 'No battles available for today' });
    }

    const team = vote.teams.find(team => team.teamId === teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found for today\'s battle' });
    }

    // Check if the user has already voted today
    const alreadyVoted = team.votersIds.some(voter => voter.telegramId === telegramId);

    if (alreadyVoted) {
      return res.status(400).json({ message: 'You have already voted today' });
    }

    // Add the user to the votersIds array for the selected team
    team.votersIds.push({ telegramId, createdAt: new Date() });

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.voteDetails = {
      votingTeamId: teamId,
      voteStatus: true,
      voteDate: new Date(),
    };

    // Save the updated user
    await user.save();

    // Save the updated vote document
    await vote.save();  // Make sure this does not overwrite required fields

    // Log the successful update
    logger.info(`User with telegramId ${telegramId} successfully chose team ${teamId}`);

    // Respond with success message
    return res.status(200).json({ message: 'Team successfully chosen', vote });
  } catch (err) {
    next(err)
    logger.error(`Error choosing team for telegramId ${telegramId}: ${err.message}`);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

module.exports = {
  getBattleByDate,
  userChooseTeam
}
