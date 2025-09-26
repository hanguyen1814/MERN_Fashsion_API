const router = require("express").Router();
const CartController = require("../controllers/cart.controller");
const auth = require("../middlewares/auth");

router.get("/", auth(), CartController.getMine);
router.post("/items", auth(), CartController.addItem);
router.put("/items", auth(), CartController.updateItem);
router.delete("/", auth(), CartController.clear);

module.exports = router;
