const router = require("express").Router();
const ProductController = require("../controllers/product.controller");
const auth = require("../middlewares/auth");

// Public routes
router.get("/", ProductController.list);
router.get("/search", ProductController.simpleSearch);
router.get("/search-advanced", ProductController.search);
router.get("/suggest", ProductController.suggest);
router.get("/related", ProductController.related);
router.get("/stats", ProductController.stats);
router.get("/category/:slug", ProductController.getByCategorySlug);
router.get("/brand/:slug", ProductController.getByBrandSlug);
router.get("/:slug", ProductController.detail);
router.get("/id/:id", ProductController.info);

// Admin routes
router.post("/", auth(["admin"]), ProductController.create);
router.put("/:id", auth(["admin"]), ProductController.update);
router.delete("/:id", auth(["admin"]), ProductController.remove);

module.exports = router;
