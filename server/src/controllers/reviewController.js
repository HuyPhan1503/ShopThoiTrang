const reviewModel = require('../models/reviewModel');
const productModel = require('../models/productModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const reviewController = {
    // Public: Lấy danh sách đánh giá hiển thị của 1 sản phẩm
    getReviewsByProduct: asyncHandler(async (req, res) => {
        const sanPhamId = Number(req.params.productId);
        const product = await productModel.findById(sanPhamId);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm.', 404);
        }

        const reviews = await reviewModel.findByProductId(sanPhamId);
        res.json({
            success: true,
            data: reviews
        });
    }),

    // Customer: Kiểm tra khách hàng hiện tại có quyền đánh giá sản phẩm này không
    checkCanReview: asyncHandler(async (req, res) => {
        const productId = Number(req.params.productId);
        const product = await productModel.findById(productId);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm.', 404);
        }

        const existing = await reviewModel.findByUserAndProduct(req.user.id, productId);
        if (existing) {
            return res.json({
                success: true,
                data: { canReview: false, reason: 'ALREADY_REVIEWED' }
            });
        }

        const hasPurchased = await reviewModel.hasPurchasedProduct(req.user.id, productId);
        if (!hasPurchased) {
            return res.json({
                success: true,
                data: { canReview: false, reason: 'NOT_PURCHASED' }
            });
        }

        res.json({
            success: true,
            data: { canReview: true, reason: 'ELIGIBLE' }
        });
    }),

    // Customer: Gửi đánh giá mới (Chỉ cho phép nếu đã mua sản phẩm ở trạng thái HOAN_THANH)
    createReview: asyncHandler(async (req, res) => {
        const { sanPhamId, soSao, nhanXet } = req.body;
        const productId = Number(sanPhamId);
        const rating = Number(soSao);

        if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new AppError('Vui lòng chọn sản phẩm và số sao hợp lệ (từ 1 đến 5).', 400);
        }

        const product = await productModel.findById(productId);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm.', 404);
        }

        const hasPurchased = await reviewModel.hasPurchasedProduct(req.user.id, productId);
        if (!hasPurchased) {
            throw new AppError('Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công.', 403);
        }

        const existing = await reviewModel.findByUserAndProduct(req.user.id, productId);
        if (existing) {
            throw new AppError('Bạn đã gửi đánh giá cho sản phẩm này rồi.', 409);
        }

        const newId = await reviewModel.create({
            sanPhamId: productId,
            nguoiDungId: req.user.id,
            soSao: rating,
            nhanXet: nhanXet ? String(nhanXet).trim() : null
        });

        const created = await reviewModel.findById(newId);
        res.status(201).json({
            success: true,
            message: 'Gửi đánh giá thành công.',
            data: created
        });
    }),

    // Admin: Lấy tất cả đánh giá
    getAllReviews: asyncHandler(async (req, res) => {
        const reviews = await reviewModel.findAll({
            trangThai: req.query.trangThai,
            sanPhamId: req.query.sanPhamId
        });
        res.json({
            success: true,
            data: reviews
        });
    }),

    // Admin: Ẩn hoặc hiện đánh giá
    updateReviewStatus: asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const { trangThai } = req.body;

        if (!['HIEN', 'AN'].includes(trangThai)) {
            throw new AppError('Trạng thái đánh giá không hợp lệ (chỉ chấp nhận HIEN hoặc AN).', 400);
        }

        const review = await reviewModel.findById(id);
        if (!review) {
            throw new AppError('Không tìm thấy đánh giá.', 404);
        }

        await reviewModel.updateStatus(id, trangThai);
        const updated = await reviewModel.findById(id);

        res.json({
            success: true,
            message: 'Cập nhật trạng thái đánh giá thành công.',
            data: updated
        });
    }),

    // Admin hoặc chính người viết xóa đánh giá
    deleteReview: asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const review = await reviewModel.findById(id);
        if (!review) {
            throw new AppError('Không tìm thấy đánh giá.', 404);
        }

        const role = req.user.vaiTro || req.user.VaiTro;
        if (role !== 'ADMIN' && review.NguoiDungId !== req.user.id) {
            throw new AppError('Bạn không có quyền xóa đánh giá này.', 403);
        }

        await reviewModel.delete(id);
        res.json({
            success: true,
            message: 'Xóa đánh giá thành công.'
        });
    })
};

module.exports = reviewController;