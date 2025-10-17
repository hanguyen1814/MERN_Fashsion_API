const router = require("express").Router();
const BrandController = require("../controllers/brand.controller");
const auth = require("../middlewares/auth");

router.get("/", BrandController.list);
router.post("/", auth(["admin", "staff"]), BrandController.create);
router.put("/:id", auth(["admin", "staff"]), BrandController.update);
router.delete("/:id", auth(["admin"]), BrandController.remove);

module.exports = router;
