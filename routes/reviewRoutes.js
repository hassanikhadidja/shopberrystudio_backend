const express = require("express");
const router = express.Router();
const ctrl = require("../controlles/reviewcontrolles");
const { Auth } = require("../middlewares/isAuth");
const isAdmin = require("../middlewares/isAdmin");

router.get("/", ctrl.GetReviews);
router.post("/", Auth, ctrl.AddReview);
router.patch("/:id", Auth, isAdmin, ctrl.UpdateReview);
router.delete("/:id", Auth, isAdmin, ctrl.DeleteReview);

module.exports = router;
