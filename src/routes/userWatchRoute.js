const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const {
  userWatchRewards,
  levelDetails,
  boosterDetails,
  userGameRewards
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

router.post("/userGameRewards",celebrate({
  [Segments.BODY]: Joi.object().keys({
    telegramId: Joi.string().required(),
    gamePoints: Joi.string().required(),
    boosters: Joi.array().items(Joi.string()).optional(),
   
  }),
}), userGameRewards)


router.use(errors());

module.exports = router;
