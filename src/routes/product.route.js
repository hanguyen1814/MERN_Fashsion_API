const router = require("express").Router();
const ProductController = require("../controllers/product.controller");
const auth = require("../middlewares/auth");

router.get("/", ProductController.list);
router.get("/:slug", ProductController.detail);
router.post("/", auth(["admin"]), ProductController.create);
router.put("/:id", auth(["admin"]), ProductController.update);
router.delete("/:id", auth(["admin"]), ProductController.remove);

module.exports = router;
