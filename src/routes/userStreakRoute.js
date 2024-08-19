const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const {
  streak,
  streakOfStreak,
  loginStreakRewardClaim,
  watchStreakRewardClaim,
  referStreakRewardClaim,
  taskStreakRewardClaim,
  multiStreakRewardClaim,
  streakOfStreakRewardClaim,
  unClaimedStreakRewardsClaim
} = require("../controllers/userStreakController");
router.post(
  "/streak",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      userWatchSeconds: Joi.number().required(),
    }),
  }),
  streak
);
router.post(
  "/streakOfStreak",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
    }),
  }),
  streakOfStreak
);
router.post(
  "/loginStreakRewardClaim",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      index: Joi.number().required(),
    }),
  }),
  loginStreakRewardClaim
);
router.post(
  "/watchStreakRewardClaim",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      index: Joi.number().required(),
    }),
  }),
  watchStreakRewardClaim
);
router.post(
  "/referStreakRewardClaim",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      index: Joi.number().required(),
    }),
  }),
  referStreakRewardClaim
);
router.post(
  "/taskStreakRewardClaim",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      index: Joi.number().required(),
    }),
  }),
  taskStreakRewardClaim
);
router.post(
  "/multiStreakRewardClaim",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      index: Joi.number().required(),
    }),
  }),
  multiStreakRewardClaim
);

router.post(
  "/streakOfStreakRewardClaim",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      index: Joi.number().required(),
    }),
  }),
  streakOfStreakRewardClaim
);

router.post(
  "/unClaimedStreakRewardsClaim",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required()
    }),
  }),
  unClaimedStreakRewardsClaim
);
router.use(errors());
module.exports = router;
