const express = require("express");
const router = express.Router();
const ctrl = require("../controlles/ordercontrolles");
const { Auth } = require("../middlewares/isAuth");
const { optionalAuth } = require("../middlewares/optionalAuth");
const isAdmin = require("../middlewares/isAdmin");

router.post("/", optionalAuth, ctrl.CreateOrder);
router.get("/mine", Auth, ctrl.GetMyPurchases);
router.get("/downloads", Auth, ctrl.GetMyDownloads);
router.get("/download/:productId/:fileId", Auth, ctrl.DownloadFile);
router.get("/dashboard", Auth, isAdmin, ctrl.GetDashboardStats);

router.get("/", Auth, isAdmin, ctrl.GetOrders);
router.get("/:id", Auth, isAdmin, ctrl.GetOrder);
router.patch("/:id", Auth, isAdmin, ctrl.UpdateOrderStatus);
router.delete("/:id", Auth, isAdmin, ctrl.DeleteOrder);

module.exports = router;
