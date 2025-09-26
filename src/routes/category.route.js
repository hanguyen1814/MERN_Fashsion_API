const router = require("express").Router();
const CategoryController = require("../controllers/category.controller");
const auth = require("../middlewares/auth");

router.get("/", CategoryController.list);
router.post("/", auth(["admin"]), CategoryController.create);
router.put("/:id", auth(["admin"]), CategoryController.update);
router.delete("/:id", auth(["admin"]), CategoryController.remove);

module.exports = router;
