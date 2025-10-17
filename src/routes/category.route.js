const router = require("express").Router();
const CategoryController = require("../controllers/category.controller");
const auth = require("../middlewares/auth");

router.get("/", CategoryController.list);
router.post("/", auth(["admin", "staff"]), CategoryController.create);
router.put("/:id", auth(["admin", "staff"]), CategoryController.update);
router.delete("/:id", auth(["admin"]), CategoryController.remove);

module.exports = router;
