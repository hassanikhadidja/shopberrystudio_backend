const express = require("express");
const router = express.Router();
const ctrl = require("../controlles/reviewcontrolles");
const { Auth } = require("../middlewares/isAuth");

router.get("/", ctrl.GetReviews);
router.post("/", Auth, ctrl.AddReview);

module.exports = router;
