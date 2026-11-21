const categoryModel = require('../models/categoryModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const categoryController = {
    getAllCategories: asyncHandler(async (req, res) => {
        const categories = await categoryModel.findAll();
        res.json({
            success: true,
            data: categories
        });
    }),

    getCategoryById: asyncHandler(async (req, res) => {
        const category = await categoryModel.findById(req.params.id);
        if (!category) {
            throw new AppError('Không tìm thấy danh mục.', 404);
        }
        res.json({
            success: true,
            data: category
        });
    }),

    createCategory: asyncHandler(async (req, res) => {
        const { tenDanhMuc, moTa } = req.body;
        if (!tenDanhMuc || !tenDanhMuc.trim()) {
            throw new AppError('Tên danh mục không được để trống.', 400);
        }

        const existing = await categoryModel.findByName(tenDanhMuc.trim());
        if (existing) {
            throw new AppError('Tên danh mục này đã tồn tại.', 409);
        }

        const newId = await categoryModel.create({
            tenDanhMuc: tenDanhMuc.trim(),
            moTa: moTa ? moTa.trim() : null
        });

        const created = await categoryModel.findById(newId);
        res.status(201).json({
            success: true,
            message: 'Thêm danh mục thành công.',
            data: created
        });
    }),

    updateCategory: asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const { tenDanhMuc, moTa } = req.body;

        if (!tenDanhMuc || !tenDanhMuc.trim()) {
            throw new AppError('Tên danh mục không được để trống.', 400);
        }

        const current = await categoryModel.findById(id);
        if (!current) {
            throw new AppError('Không tìm thấy danh mục.', 404);
        }

        const duplicate = await categoryModel.findByName(tenDanhMuc.trim());
        if (duplicate && duplicate.DanhMucId !== id) {
            throw new AppError('Tên danh mục này đã được sử dụng.', 409);
        }

        await categoryModel.update(id, {
            tenDanhMuc: tenDanhMuc.trim(),
            moTa: moTa !== undefined ? (moTa ? moTa.trim() : null) : current.MoTa
        });

        const updated = await categoryModel.findById(id);
        res.json({
            success: true,
            message: 'Cập nhật danh mục thành công.',
            data: updated
        });
    }),

    deleteCategory: asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const current = await categoryModel.findById(id);
        if (!current) {
            throw new AppError('Không tìm thấy danh mục.', 404);
        }

        const productCount = await categoryModel.countProducts(id);
        if (productCount > 0) {
            throw new AppError(`Không thể xóa danh mục vì đang có ${productCount} sản phẩm thuộc danh mục này.`, 400);
        }

        await categoryModel.delete(id);
        res.json({
            success: true,
            message: 'Xóa danh mục thành công.'
        });
    })
};

module.exports = categoryController;