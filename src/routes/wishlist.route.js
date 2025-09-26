const router = require("express").Router();
const WishlistController = require("../controllers/wishlist.controller");
const auth = require("../middlewares/auth");

router.get("/", auth(), WishlistController.getMine);
router.post("/toggle", auth(), WishlistController.toggle);

module.exports = router;
