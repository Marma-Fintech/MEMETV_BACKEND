const express = require("express");
const router = express.Router();
const { celebrate, Joi, errors, Segments } = require("celebrate");
const { login,userDetails,userGameRewards } = require("../controllers/userController");


router.post(
    "/login",
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        name: Joi.string().required(),
        refferedById: Joi.string().optional(),
        telegramId: Joi.string().required(),
      }),
    }),
    login
  );

  router.get(
    "/userDetails/:telegramId",
    celebrate({
      [Segments.PARAMS]: Joi.object().keys({
        telegramId: Joi.string().required(),
      }),
    }),
    userDetails
  );

  router.post("/userGameRewards",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      telegramId: Joi.string().required(),
      gamePoints: Joi.string().required(),
      boosters: Joi.array().items(Joi.string()).optional(),
     
    }),
  }), userGameRewards
  );

router.use(errors());

module.exports = router;