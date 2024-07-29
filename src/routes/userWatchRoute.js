const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const {
  userWatchRewards,
  levelDetails,
  boosterDetails,
  purchaseBooster,
  stakingRewards
} = require("../controllers/userWatchController");

router.post(
  "/userWatchRewards",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      userWatchSeconds: Joi.number().required(),
      boosterPoints: Joi.string().optional(),
    }),
  }),
  userWatchRewards
);

router.get(
  "/levelDetails/:telegramId",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      telegramId: Joi.string().required(),
    }),
  }),
  levelDetails
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

router.post("/stakingRewards",
celebrate({
  [Segments.BODY]: Joi.object().keys({
    stakingId: Joi.string().required(),
  }),
}),
stakingRewards
);

router.use(errors());

module.exports = router;
