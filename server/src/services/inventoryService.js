const { pool } = require('../config/database');
const AppError = require('../utils/AppError');

const inventoryService = {
    // Khóa dòng biến thể (FOR UPDATE) và kiểm tra điều kiện bán + số lượng tồn trong Transaction
    async validateAndLockItems(conn, items) {
        const variantIds = items.map((item) => item.bienTheId);
        const placeholders = variantIds.map(() => '?').join(', ');

        const [rows] = await conn.query(
            `SELECT b.BienTheId, b.SanPhamId, b.Size, b.Mau, b.Sku, b.SoLuongTon,
                    s.TenSanPham, s.Gia, s.TrangThai
             FROM BIEN_THE b
             JOIN SAN_PHAM s ON b.SanPhamId = s.SanPhamId
             WHERE b.BienTheId IN (${placeholders})
             FOR UPDATE`,
            variantIds
        );

        const variantMap = new Map(rows.map((row) => [row.BienTheId, row]));
        const validatedItems = [];

        for (const item of items) {
            const variant = variantMap.get(item.bienTheId);
            if (!variant) {
                throw new AppError(`Biến thể sản phẩm ID ${item.bienTheId} không tồn tại.`, 404);
            }

            if (variant.TrangThai !== 'DANG_BAN') {
                throw new AppError(`Sản phẩm "${variant.TenSanPham}" hiện đã ngừng kinh doanh.`, 400);
            }

            if (variant.SoLuongTon < item.soLuong) {
                throw new AppError(
                    `Sản phẩm "${variant.TenSanPham}" (${variant.Size} - ${variant.Mau}) chỉ còn ${variant.SoLuongTon} sản phẩm trong kho.`,
                    400
                );
            }

            const donGia = Number(variant.Gia);
            validatedItems.push({
                bienTheId: variant.BienTheId,
                sanPhamId: variant.SanPhamId,
                tenSanPham: variant.TenSanPham,
                size: variant.Size,
                mau: variant.Mau,
                sku: variant.Sku,
                soLuong: item.soLuong,
                donGia,
                thanhTien: donGia * item.soLuong
            });
        }

        return validatedItems;
    },

    // Trừ tồn kho sau khi tạo chi tiết đơn hàng
    async deductStock(conn, validatedItems) {
        for (const item of validatedItems) {
            const [result] = await conn.query(
                `UPDATE BIEN_THE
                 SET SoLuongTon = SoLuongTon - ?
                 WHERE BienTheId = ? AND SoLuongTon >= ?`,
                [item.soLuong, item.bienTheId, item.soLuong]
            );

            if (result.affectedRows === 0) {
                throw new AppError(`Không đủ tồn kho cho mã SKU ${item.sku}.`, 400);
            }
        }
    },

    // Lấy danh sách biến thể sắp hết hàng cho trang quản trị
    async getLowStockVariants(threshold = 5) {
        const [rows] = await pool.query(
            `SELECT b.BienTheId, b.SanPhamId, s.TenSanPham, b.Size, b.Mau, b.Sku, b.SoLuongTon
             FROM BIEN_THE b
             JOIN SAN_PHAM s ON b.SanPhamId = s.SanPhamId
             WHERE s.TrangThai = 'DANG_BAN' AND b.SoLuongTon <= ?
             ORDER BY b.SoLuongTon ASC, b.BienTheId ASC`,
            [Number(threshold)]
        );
        return rows;
    }
};

module.exports = inventoryService;