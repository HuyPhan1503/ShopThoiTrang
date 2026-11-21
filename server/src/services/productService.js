const { pool } = require('../config/database');
const productModel = require('../models/productModel');
const variantModel = require('../models/variantModel');
const categoryModel = require('../models/categoryModel');
const AppError = require('../utils/AppError');

const buildSku = (sanPhamId, size, mau) => {
    const cleanSize = String(size).trim().toUpperCase().replace(/\s+/g, '');
    const cleanMau = String(mau)
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'D')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    return `SP${String(sanPhamId).padStart(3, '0')}-${cleanSize}-${cleanMau}`;
};

const productService = {
    async getProducts(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
        const offset = (page - 1) * limit;

        // Mặc định khách hàng chỉ xem sản phẩm DANG_BAN; Admin có thể truyền trangThai=ALL
        const trangThai = query.trangThai || 'DANG_BAN';

        const { items, total } = await productModel.findAll({
            danhMucId: query.danhMucId,
            keyword: query.keyword ? query.keyword.trim() : '',
            trangThai,
            minGia: query.minGia,
            maxGia: query.maxGia,
            sort: query.sort,
            limit,
            offset
        });

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    async getProductDetail(id) {
        const product = await productModel.findById(id);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm.', 404);
        }

        const bienThe = await variantModel.findByProductId(id);
        return {
            ...product,
            bienThe
        };
    },

    async createProduct(payload) {
        const { danhMucId, tenSanPham, moTa, gia, anhUrl, trangThai = 'DANG_BAN', bienThe = [] } = payload;

        if (!danhMucId || !tenSanPham || gia === undefined) {
            throw new AppError('Vui lòng nhập đầy đủ danh mục, tên sản phẩm và giá bán.', 400);
        }

        if (Number(gia) <= 0) {
            throw new AppError('Giá sản phẩm phải lớn hơn 0.', 400);
        }

        if (!['DANG_BAN', 'NGUNG_KINH_DOANH'].includes(trangThai)) {
            throw new AppError('Trạng thái sản phẩm không hợp lệ.', 400);
        }

        const category = await categoryModel.findById(danhMucId);
        if (!category) {
            throw new AppError('Danh mục không tồn tại.', 404);
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const newProductId = await productModel.create(
                {
                    danhMucId: Number(danhMucId),
                    tenSanPham: tenSanPham.trim(),
                    moTa: moTa ? moTa.trim() : null,
                    gia: Number(gia),
                    anhUrl: anhUrl ? anhUrl.trim() : null,
                    trangThai
                },
                conn
            );

            if (Array.isArray(bienThe) && bienThe.length > 0) {
                for (const item of bienThe) {
                    if (!item.size || !item.mau) {
                        throw new AppError('Mỗi biến thể phải có đầy đủ Size và Màu.', 400);
                    }
                    const soLuongTon = Number(item.soLuongTon ?? 0);
                    if (soLuongTon < 0) {
                        throw new AppError('Số lượng tồn kho không được âm.', 400);
                    }

                    const sku = item.sku ? item.sku.trim().toUpperCase() : buildSku(newProductId, item.size, item.mau);
                    await variantModel.create(
                        {
                            sanPhamId: newProductId,
                            size: String(item.size).trim(),
                            mau: String(item.mau).trim(),
                            sku,
                            soLuongTon
                        },
                        conn
                    );
                }
            }

            await conn.commit();
            return await this.getProductDetail(newProductId);
        } catch (error) {
            await conn.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                throw new AppError('Bị trùng mã SKU hoặc cặp Size - Màu trong danh sách biến thể.', 409);
            }
            throw error;
        } finally {
            conn.release();
        }
    },

    async updateProduct(id, payload) {
        const current = await productModel.findById(id);
        if (!current) {
            throw new AppError('Không tìm thấy sản phẩm.', 404);
        }

        const danhMucId = payload.danhMucId !== undefined ? Number(payload.danhMucId) : current.DanhMucId;
        const tenSanPham = payload.tenSanPham !== undefined ? payload.tenSanPham.trim() : current.TenSanPham;
        const moTa = payload.moTa !== undefined ? (payload.moTa ? payload.moTa.trim() : null) : current.MoTa;
        const gia = payload.gia !== undefined ? Number(payload.gia) : Number(current.Gia);
        const anhUrl = payload.anhUrl !== undefined ? (payload.anhUrl ? payload.anhUrl.trim() : null) : current.AnhUrl;
        const trangThai = payload.trangThai !== undefined ? payload.trangThai : current.TrangThai;

        if (!tenSanPham) {
            throw new AppError('Tên sản phẩm không được để trống.', 400);
        }
        if (gia <= 0) {
            throw new AppError('Giá sản phẩm phải lớn hơn 0.', 400);
        }
        if (!['DANG_BAN', 'NGUNG_KINH_DOANH'].includes(trangThai)) {
            throw new AppError('Trạng thái sản phẩm không hợp lệ.', 400);
        }

        const category = await categoryModel.findById(danhMucId);
        if (!category) {
            throw new AppError('Danh mục không tồn tại.', 404);
        }

        await productModel.update(id, { danhMucId, tenSanPham, moTa, gia, anhUrl, trangThai });
        return await this.getProductDetail(id);
    },

    async deleteProduct(id) {
        const current = await productModel.findById(id);
        if (!current) {
            throw new AppError('Không tìm thấy sản phẩm.', 404);
        }

        const orderCount = await productModel.countOrders(id);
        if (orderCount > 0) {
            throw new AppError(
                'Sản phẩm này đã phát sinh đơn hàng nên không thể xóa. Hãy chuyển trạng thái sang NGUNG_KINH_DOANH.',
                400
            );
        }

        await productModel.delete(id);
    },

    async addVariant(sanPhamId, { size, mau, sku, soLuongTon = 0 }) {
        const product = await productModel.findById(sanPhamId);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm.', 404);
        }

        if (!size || !mau) {
            throw new AppError('Vui lòng nhập đầy đủ Size và Màu.', 400);
        }

        const stock = Number(soLuongTon);
        if (stock < 0) {
            throw new AppError('Số lượng tồn kho không được nhỏ hơn 0.', 400);
        }

        const trimmedSize = String(size).trim();
        const trimmedMau = String(mau).trim();

        const dupCombo = await variantModel.findByProductSizeColor(sanPhamId, trimmedSize, trimmedMau);
        if (dupCombo) {
            throw new AppError(`Biến thể Size "${trimmedSize}" - Màu "${trimmedMau}" đã tồn tại cho sản phẩm này.`, 409);
        }

        const finalSku = sku ? String(sku).trim().toUpperCase() : buildSku(sanPhamId, trimmedSize, trimmedMau);
        const dupSku = await variantModel.findBySku(finalSku);
        if (dupSku) {
            throw new AppError(`Mã SKU "${finalSku}" đã được sử dụng.`, 409);
        }

        const newId = await variantModel.create({
            sanPhamId: Number(sanPhamId),
            size: trimmedSize,
            mau: trimmedMau,
            sku: finalSku,
            soLuongTon: stock
        });

        return await variantModel.findById(newId);
    },

    async updateVariant(variantId, payload) {
        const current = await variantModel.findById(variantId);
        if (!current) {
            throw new AppError('Không tìm thấy biến thể sản phẩm.', 404);
        }

        const size = payload.size !== undefined ? String(payload.size).trim() : current.Size;
        const mau = payload.mau !== undefined ? String(payload.mau).trim() : current.Mau;
        const sku = payload.sku !== undefined ? String(payload.sku).trim().toUpperCase() : current.Sku;
        const soLuongTon = payload.soLuongTon !== undefined ? Number(payload.soLuongTon) : current.SoLuongTon;

        if (!size || !mau || !sku) {
            throw new AppError('Size, Màu và mã SKU không được để trống.', 400);
        }
        if (soLuongTon < 0) {
            throw new AppError('Số lượng tồn kho không được âm.', 400);
        }

        const dupCombo = await variantModel.findByProductSizeColor(current.SanPhamId, size, mau);
        if (dupCombo && dupCombo.BienTheId !== Number(variantId)) {
            throw new AppError(`Biến thể Size "${size}" - Màu "${mau}" đã tồn tại.`, 409);
        }

        const dupSku = await variantModel.findBySku(sku);
        if (dupSku && dupSku.BienTheId !== Number(variantId)) {
            throw new AppError(`Mã SKU "${sku}" đã được sử dụng.`, 409);
        }

        await variantModel.update(variantId, { size, mau, sku, soLuongTon });
        return await variantModel.findById(variantId);
    },

    async deleteVariant(variantId) {
        const current = await variantModel.findById(variantId);
        if (!current) {
            throw new AppError('Không tìm thấy biến thể sản phẩm.', 404);
        }

        const orderCount = await variantModel.countOrders(variantId);
        if (orderCount > 0) {
            throw new AppError('Biến thể này đã có trong đơn hàng nên không thể xóa. Bạn có thể cập nhật tồn kho về 0.', 400);
        }

        await variantModel.delete(variantId);
    }
};

module.exports = productService;