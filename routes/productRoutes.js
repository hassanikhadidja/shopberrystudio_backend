const express = require("express");
const router = express.Router();
const controlles = require("../controlles/productcontrolles");
const upload = require("../utils/multer");
const { Auth } = require("../middlewares/isAuth");
const isAdmin = require("../middlewares/isAdmin");

/** Accept JSON body (dashboard) or multipart uploads (Cloudinary). */
function optionalUpload(req, res, next) {
  const type = String(req.headers["content-type"] || "");
  if (type.includes("multipart/form-data")) {
    return upload.array("files", 10)(req, res, (err) => {
      if (err) return res.status(400).json({ msg: err.message });
      next();
    });
  }
  next();
}

router.get("/", controlles.GetProducts);
router.get("/:id", controlles.GetOneProduct);

router.post("/", Auth, isAdmin, optionalUpload, controlles.AddProduct);
router.patch("/:id", Auth, isAdmin, optionalUpload, controlles.UpdateProduct);
router.delete("/:id", Auth, isAdmin, controlles.DeleteProduct);

module.exports = router;
