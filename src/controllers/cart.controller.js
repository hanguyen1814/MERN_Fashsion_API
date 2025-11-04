const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/apiResponse");

class CartController {
  /**
   * Tính toán tổng tiền giỏ hàng
   */
  static computeTotals(items = []) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const discount = 0; // TODO: Implement coupon logic
    const shippingFee = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k
    const total = subtotal - discount + shippingFee;
    return { subtotal, discount, shippingFee, total };
  }

  /**
   * Enrich items: gắn thêm thông tin product và variant chi tiết vào mỗi item
   */
  static async buildCartResponse(cart) {
    if (!cart)
      return { items: [], subtotal: 0, discount: 0, shippingFee: 0, total: 0 };

    const productIds = [...new Set(cart.items.map((i) => String(i.productId)))];
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productById = new Map(products.map((p) => [String(p._id), p]));

    const aggregatedByProduct = new Map();

    for (const item of cart.items) {
      const productKey = String(item.productId);
      const p = productById.get(productKey);

      if (!p) {
        // fallback entry for unknown product
        const existing = aggregatedByProduct.get(productKey);
        const variantEntry = {
          sku: item.sku,
          color_name: null,
          size_name: null,
          price: Number(item.price || 0),
          origin_price: undefined,
          discount: 0,
          stock: 0,
          image: item.image || null,
          quantity: item.quantity,
        };
        if (existing) {
          existing.variants.push(variantEntry);
        } else {
          aggregatedByProduct.set(productKey, {
            product_id: productKey,
            name: item.name || "",
            price: Number(item.price || 0),
            origin_price: undefined,
            discount: 0,
            stock: 0,
            image: item.image || null,
            variants: [variantEntry],
          });
        }
        continue;
      }

      // Compute product summary once
      if (!aggregatedByProduct.has(productKey)) {
        const priceListAll = (p.variants || [])
          .map((v) => Number(v?.price || 0))
          .filter((n) => Number.isFinite(n));
        const originListAll = (p.variants || [])
          .map((v) => Number(v?.compareAtPrice || 0) || undefined)
          .filter((n) => Number.isFinite(Number(n)));
        const stockTotal = (p.variants || []).reduce(
          (acc, v) => acc + Number(v?.stock || 0),
          0
        );
        const minPrice = priceListAll.length ? Math.min(...priceListAll) : 0;
        const minOrigin = originListAll.length
          ? Math.min(...originListAll)
          : undefined;
        const minDiscount =
          Number.isFinite(minOrigin) && minOrigin > minPrice
            ? Math.round(((minOrigin - minPrice) / minOrigin) * 100)
            : 0;

        aggregatedByProduct.set(productKey, {
          product_id: String(p._id || ""),
          name: p?.name || "",
          price: minPrice,
          origin_price: minOrigin,
          discount: minDiscount,
          stock: stockTotal,
          image: p?.image || p?.variants?.[0]?.image || null,
          variants: [],
        });
      }

      const group = aggregatedByProduct.get(productKey);
      const selectedRaw = p.variants?.find((v) => v.sku === item.sku);
      const selectedVariant = selectedRaw
        ? {
            sku: selectedRaw.sku,
            color_name: selectedRaw.color || null,
            size_name: selectedRaw.size || null,
            price: Number(selectedRaw.price || 0),
            origin_price: Number(selectedRaw.compareAtPrice || 0) || undefined,
            discount:
              Number(selectedRaw.compareAtPrice || 0) >
              Number(selectedRaw.price || 0)
                ? Math.round(
                    ((Number(selectedRaw.compareAtPrice) -
                      Number(selectedRaw.price)) /
                      Number(selectedRaw.compareAtPrice)) *
                      100
                  )
                : Number(selectedRaw.discount || 0) || 0,
            stock: Number(selectedRaw.stock || 0),
            image: selectedRaw.image || null,
            quantity: item.quantity,
          }
        : {
            sku: item.sku,
            color_name: null,
            size_name: null,
            price: Number(item.price || 0),
            origin_price: undefined,
            discount: 0,
            stock: 0,
            image: item.image || null,
            quantity: item.quantity,
          };

      // If same sku already added (duplicate lines), sum quantity
      const existingIdx = group.variants.findIndex(
        (v) => v.sku === selectedVariant.sku
      );
      if (existingIdx >= 0) {
        group.variants[existingIdx].quantity += selectedVariant.quantity;
      } else {
        group.variants.push(selectedVariant);
      }
    }

    const items = Array.from(aggregatedByProduct.values());

    const { subtotal, discount, shippingFee, total } =
      CartController.computeTotals(cart.items);

    return { items, subtotal, discount, shippingFee, total };
  }

  /**
   * Lấy giỏ hàng của user hiện tại
   */
  static getMine = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Tìm hoặc tạo giỏ hàng mới
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Tính toán và cập nhật tổng tiền
    const totals = CartController.computeTotals(cart.items);
    Object.assign(cart, totals);
    await cart.save();

    const data = await CartController.buildCartResponse(cart);
    return ok(res, data);
  });

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  static addItem = asyncHandler(async (req, res) => {
    const { productId, sku, quantity = 1 } = req.body;
    const userId = req.user.id;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      return fail(res, 404, "Sản phẩm không tồn tại");
    }

    // Kiểm tra variant/SKU
    const variant = product.variants.find((v) => v.sku === sku);
    if (!variant) {
      return fail(res, 404, "SKU không tồn tại");
    }

    // Kiểm tra tồn kho
    if (variant.stock < quantity) {
      return fail(res, 400, "Hết hàng/không đủ tồn");
    }

    // Tìm hoặc tạo giỏ hàng
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Kiểm tra item đã có trong giỏ chưa
    const existingItem = cart.items.find((item) => item.sku === sku);
    const MAX_QUANTITY = 999; // Giới hạn tối đa mỗi sản phẩm

    if (existingItem) {
      const newQuantity = existingItem.quantity + Number(quantity);
      if (newQuantity > MAX_QUANTITY) {
        return fail(
          res,
          400,
          `Số lượng tối đa cho mỗi sản phẩm là ${MAX_QUANTITY}`
        );
      }
      if (variant.stock < newQuantity) {
        return fail(res, 400, "Không đủ tồn kho cho số lượng này");
      }
      existingItem.quantity = newQuantity;
    } else {
      if (quantity > MAX_QUANTITY) {
        return fail(
          res,
          400,
          `Số lượng tối đa cho mỗi sản phẩm là ${MAX_QUANTITY}`
        );
      }
      cart.items.push({
        productId,
        sku,
        name: product.name,
        price: variant.price,
        quantity,
        image: variant.image || product.images?.[0],
      });
    }

    // Cập nhật tổng tiền
    const totals = CartController.computeTotals(cart.items);
    Object.assign(cart, totals);
    await cart.save();

    const data = await CartController.buildCartResponse(cart);
    return ok(res, data);
  });

  /**
   * Cập nhật số lượng sản phẩm trong giỏ hàng
   */
  static updateItem = asyncHandler(async (req, res) => {
    // Hỗ trợ cập nhật theo productId + sku, và cho phép đổi newSku
    const { productId, sku, newSku, quantity } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return fail(res, 404, "Chưa có giỏ hàng");
    }

    const item = cart.items.find((it) => {
      if (productId) {
        return String(it.productId) === String(productId) && it.sku === sku;
      }
      return it.sku === sku; // fallback tương thích cũ
    });
    if (!item) {
      return fail(res, 404, "Item không tồn tại trong giỏ hàng");
    }

    // Nếu có yêu cầu đổi variant (newSku), cập nhật sku/price/image theo variant mới
    if (newSku && newSku !== sku) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return fail(res, 404, "Sản phẩm không tồn tại");
      }
      const newVariant = product.variants.find((v) => v.sku === newSku);
      if (!newVariant) {
        return fail(res, 404, "SKU mới không tồn tại");
      }
      // nếu quantity gửi kèm thì kiểm tra tồn
      const nextQty = typeof quantity === "number" ? quantity : item.quantity;
      if (newVariant.stock < nextQty) {
        return fail(res, 400, "Hết hàng/không đủ tồn cho SKU mới");
      }
      item.sku = newVariant.sku;
      item.price = newVariant.price;
      item.image = newVariant.image || product.images?.[0] || item.image;
      // giữ nguyên name từ snapshot hoặc cập nhật tên mới nếu muốn
      if (typeof quantity === "number") item.quantity = nextQty;
    } else if (typeof quantity === "number") {
      // Chỉ cập nhật số lượng
      if (quantity <= 0) {
        cart.items = cart.items.filter((it) => {
          if (productId) {
            return !(
              String(it.productId) === String(productId) && it.sku === sku
            );
          }
          return it.sku !== sku;
        });
      } else {
        // Kiểm tra giới hạn số lượng
        const MAX_QUANTITY = 999;
        if (quantity > MAX_QUANTITY) {
          return fail(
            res,
            400,
            `Số lượng tối đa cho mỗi sản phẩm là ${MAX_QUANTITY}`
          );
        }
        // Kiểm tra tồn kho của sku hiện tại
        const product = await Product.findById(item.productId);
        const variant = product?.variants?.find((v) => v.sku === item.sku);
        if (variant && variant.stock < quantity) {
          return fail(res, 400, "Hết hàng/không đủ tồn");
        }
        item.quantity = quantity;
      }
    }

    // Cập nhật tổng tiền
    const totals = CartController.computeTotals(cart.items);
    Object.assign(cart, totals);
    await cart.save();

    const data = await CartController.buildCartResponse(cart);
    return ok(res, data);
  });

  /**
   * Xóa toàn bộ giỏ hàng
   */
  static clear = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { userId },
      {
        items: [],
        subtotal: 0,
        discount: 0,
        shippingFee: 0,
        total: 0,
      },
      { new: true }
    );

    const data = await CartController.buildCartResponse(cart);
    return ok(res, data);
  });
}

module.exports = CartController;
