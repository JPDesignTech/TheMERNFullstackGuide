const express = require("express");
const { check } = require("express-validator"); // Backend Validator
const placesContoller = require("../controllers/places-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

const fileUpload = require("../middleware/file-upload");
router.get("/:pid", placesContoller.getPlacesById);

router.get("/user/:uid", placesContoller.getPlacesByUserId);

router.get(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesContoller.createPlace
);

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesContoller.editPlace
);

router.delete(
  "/:pid",
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesContoller.deletePlace
);

module.exports = router;
