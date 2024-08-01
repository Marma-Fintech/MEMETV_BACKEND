const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const {streak} = require("../controllers/userStreakController");
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
router.use(errors());

module.exports = router;