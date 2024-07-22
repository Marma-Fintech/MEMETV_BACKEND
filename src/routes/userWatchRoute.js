const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const {
  userWatchRewards,
  levelDetails,
  boosterDetails,
} = require("../controllers/userWatchController");

router.post(
  "/userWatchRewards",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      userWatchSeconds: Joi.number().required(),
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

router.use(errors());

module.exports = router;
