const CART_KEY = 'shopthoitrang_cart';

const cartService = {
    getCart() {
        try {
            const raw = localStorage.getItem(CART_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    saveCart(items) {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
        return items;
    },

    addItem(product, variant, quantity = 1) {
        const cart = this.getCart();
        const existingIndex = cart.findIndex((item) => item.bienTheId === variant.BienTheId);

        if (existingIndex > -1) {
            const nextQty = Math.min(
                variant.SoLuongTon,
                cart[existingIndex].soLuong + quantity
            );
            cart[existingIndex].soLuong = nextQty;
            cart[existingIndex].soLuongTon = variant.SoLuongTon;
            cart[existingIndex].gia = Number(product.Gia);
        } else {
            cart.push({
                bienTheId: variant.BienTheId,
                sanPhamId: product.SanPhamId,
                tenSanPham: product.TenSanPham,
                anhUrl: product.AnhUrl,
                gia: Number(product.Gia),
                size: variant.Size,
                mau: variant.Mau,
                sku: variant.Sku,
                soLuongTon: variant.SoLuongTon,
                soLuong: Math.min(variant.SoLuongTon, Math.max(1, quantity))
            });
        }

        return this.saveCart(cart);
    },

    updateQuantity(bienTheId, quantity) {
        const cart = this.getCart();
        const updated = cart
            .map((item) => {
                if (item.bienTheId !== bienTheId) return item;
                const safeQty = Math.min(item.soLuongTon, Math.max(0, Number(quantity)));
                return { ...item, soLuong: safeQty };
            })
            .filter((item) => item.soLuong > 0);

        return this.saveCart(updated);
    },

    removeItem(bienTheId) {
        const cart = this.getCart().filter((item) => item.bienTheId !== bienTheId);
        return this.saveCart(cart);
    },

    clearCart() {
        localStorage.removeItem(CART_KEY);
        return [];
    }
};

export default cartService;