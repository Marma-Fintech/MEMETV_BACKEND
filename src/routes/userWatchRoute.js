const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const { userWatchRewards } = require("../controllers/userWatchController");


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

router.use(errors());

module.exports = router;