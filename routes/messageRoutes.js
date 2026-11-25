const express = require("express");
const router = express.Router();
const ctrl = require("../controlles/messagecontrolles");
const { Auth } = require("../middlewares/isAuth");

router.get("/", Auth, ctrl.GetMessages);
router.post("/", Auth, ctrl.SendMessage);

module.exports = router;
