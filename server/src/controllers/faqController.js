const faqModel = require('../models/faqModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const VALID_TOPICS = ['Đặt hàng', 'Thanh toán', 'Giao hàng', 'Đổi trả', 'Tài khoản'];

const faqController = {
    getAllFaqs: asyncHandler(async (req, res) => {
        const faqs = await faqModel.findAll({
            chuDe: req.query.chuDe,
            keyword: req.query.keyword ? req.query.keyword.trim() : ''
        });
        res.json({
            success: true,
            data: faqs
        });
    }),

    getFaqById: asyncHandler(async (req, res) => {
        const faq = await faqModel.findById(req.params.id);
        if (!faq) {
            throw new AppError('Không tìm thấy câu hỏi thường gặp.', 404);
        }
        res.json({
            success: true,
            data: faq
        });
    }),

    createFaq: asyncHandler(async (req, res) => {
        const { chuDe, cauHoi, traLoi } = req.body;

        if (!chuDe || !cauHoi || !traLoi) {
            throw new AppError('Vui lòng nhập đầy đủ chủ đề, câu hỏi và câu trả lời.', 400);
        }

        if (!VALID_TOPICS.includes(chuDe)) {
            throw new AppError(`Chủ đề không hợp lệ. Chỉ chấp nhận: ${VALID_TOPICS.join(', ')}.`, 400);
        }

        const newId = await faqModel.create({
            chuDe,
            cauHoi: cauHoi.trim(),
            traLoi: traLoi.trim()
        });

        const created = await faqModel.findById(newId);
        res.status(201).json({
            success: true,
            message: 'Thêm câu hỏi thường gặp thành công.',
            data: created
        });
    }),

    updateFaq: asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const current = await faqModel.findById(id);
        if (!current) {
            throw new AppError('Không tìm thấy câu hỏi thường gặp.', 404);
        }

        const chuDe = req.body.chuDe !== undefined ? req.body.chuDe : current.ChuDe;
        const cauHoi = req.body.cauHoi !== undefined ? req.body.cauHoi.trim() : current.CauHoi;
        const traLoi = req.body.traLoi !== undefined ? req.body.traLoi.trim() : current.TraLoi;

        if (!VALID_TOPICS.includes(chuDe)) {
            throw new AppError(`Chủ đề không hợp lệ. Chỉ chấp nhận: ${VALID_TOPICS.join(', ')}.`, 400);
        }
        if (!cauHoi || !traLoi) {
            throw new AppError('Câu hỏi và câu trả lời không được để trống.', 400);
        }

        await faqModel.update(id, { chuDe, cauHoi, traLoi });
        const updated = await faqModel.findById(id);

        res.json({
            success: true,
            message: 'Cập nhật câu hỏi thường gặp thành công.',
            data: updated
        });
    }),

    deleteFaq: asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const current = await faqModel.findById(id);
        if (!current) {
            throw new AppError('Không tìm thấy câu hỏi thường gặp.', 404);
        }

        await faqModel.delete(id);
        res.json({
            success: true,
            message: 'Xóa câu hỏi thường gặp thành công.'
        });
    })
};

module.exports = faqController;