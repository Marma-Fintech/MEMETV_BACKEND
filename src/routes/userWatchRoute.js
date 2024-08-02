const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const {
  userWatchRewards,
  boosterDetails,
  purchaseBooster,
  stakingRewards,
  popularUser,
  yourRefferals,
} = require("../controllers/userWatchController");

router.post(
  "/userWatchRewards",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      userWatchSeconds: Joi.number().optional(),
      boosterPoints: Joi.string().optional(),
      boosters: Joi.array().items(Joi.string()).optional(),
    }),
  }),
  userWatchRewards
);

router.get(
  "/boosterDetails/:telegramId",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      telegramId: Joi.string().required(),
    }),
  }),
  boosterDetails
);

router.post(
  "/purchaseBooster",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      boosterPoints: Joi.string().required(),
      booster: Joi.string().required(),
    }),
  }),
  purchaseBooster
);

router.post(
  "/stakingRewards",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      stakingId: Joi.string().required(),
    }),
  }),
  stakingRewards
);

router.get(
  "/popularUser/:telegramId",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      telegramId: Joi.string().required(),
    }),
  }),
  popularUser
);

router.get(
  "/yourRefferals/:telegramId",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      telegramId: Joi.string().required(),
    }),
  }),
  yourRefferals
);

router.use(errors());

module.exports = router;
