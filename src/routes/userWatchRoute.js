const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const { userWatchRewards,levelDetails } = require("../controllers/userWatchController");


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
    '/levelDetails/:telegramId',
    celebrate({
      [Segments.PARAMS]: Joi.object().keys({
        telegramId: Joi.string().required(),
      }),
    }),
    levelDetails
  );

router.use(errors());

module.exports = router;