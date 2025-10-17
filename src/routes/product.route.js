const router = require("express").Router();
const ProductController = require("../controllers/product.controller");
const auth = require("../middlewares/auth");
const {
  productValidation,
  paginationValidation,
} = require("../middlewares/validation");
const { rbac, requireStaffOrAdmin } = require("../middlewares/rbac");

// Public routes
router.get("/", paginationValidation.query, ProductController.list);
router.get("/search", ProductController.simpleSearch);
router.get("/search-advanced", ProductController.search);
router.get("/suggest", ProductController.suggest);
router.get("/related", ProductController.related);
router.get("/stats", ProductController.stats);
router.get("/category/:slug", ProductController.getByCategorySlug);
router.get("/brand/:slug", ProductController.getByBrandSlug);
router.get("/:slug", ProductController.detail);
router.get("/id/:id", productValidation.productId, ProductController.info);

// Admin/Staff routes
router.post(
  "/",
  auth(),
  rbac("product:write:all"),
  productValidation.create,
  ProductController.create
);
router.put(
  "/:id",
  auth(),
  rbac("product:write:all"),
  productValidation.productId,
  productValidation.update,
  ProductController.update
);
router.delete(
  "/:id",
  auth(),
  rbac("product:delete:all"),
  productValidation.productId,
  ProductController.remove
);

module.exports = router;
