const express = require("express");
const router = express.Router();

//all routes
router.use("/", require("./userRoute"));

module.exports = router;
