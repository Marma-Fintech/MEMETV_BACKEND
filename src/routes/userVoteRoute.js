const express = require('express')
const router = express.Router()
const { celebrate, Joi, errors, Segments } = require('celebrate')
const {
    userChoosePoll,
    calculateVotes
} = require('../controllers/userVoteController')

router.post(
  '/userChoosePoll',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      voteChoice: Joi.string().required(),
      voteChoiceId: Joi.string().required(),
      telegramId: Joi.string().required(),
    })
  }),
  userChoosePoll
)

router.post('/calculateVotes',
celebrate({
    [Segments.BODY]: Joi.object().keys({
      voteCount: Joi.number().required(),
      voteChoiceId: Joi.string().required(),
      telegramId: Joi.string().required(),
    })
  }),
  calculateVotes
)

router.use(errors())

module.exports = router
