const express = require("express");
const router = express.Router();
const usercontrolles = require("../controlles/usercontrolles");
const { Auth } = require("../middlewares/isAuth");
const isAdmin = require("../middlewares/isAdmin");

router.post("/register", usercontrolles.Adduser);
router.post("/login", usercontrolles.Login);
router.post("/google", usercontrolles.GoogleContinue);

router.get("/getcurrentuser", Auth, usercontrolles.getUser);
router.patch("/me/notifications", Auth, usercontrolles.SetNotifications);
router.post("/me/favorites/:productId", Auth, usercontrolles.ToggleFavorite);

router.get("/", Auth, isAdmin, usercontrolles.getUsers);
router.post("/admin", Auth, isAdmin, usercontrolles.AdminAddUser);
router.patch("/:id", Auth, usercontrolles.UpdateUSER);
router.delete("/:id", Auth, isAdmin, usercontrolles.DeleteUser);

module.exports = router;
