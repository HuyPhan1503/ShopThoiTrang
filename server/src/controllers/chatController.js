const chatService = require('../services/chatService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const chatController = {
    sendMessage: asyncHandler(async (req, res) => {
        const { message, history } = req.body || {};
        if (!message || !String(message).trim()) {
            throw new AppError('Vui lòng nhập nội dung tin nhắn.', 400);
        }
        if (String(message).length > 1000) {
            throw new AppError('Tin nhắn quá dài (tối đa 1000 ký tự).', 400);
        }

        const result = await chatService.handleMessage(message, history);
        res.json({
            success: true,
            data: result
        });
    }),

    getStatus: asyncHandler(async (req, res) => {
        const hasGemini = Boolean((process.env.GEMINI_API_KEY || '').trim());
        res.json({
            success: true,
            data: {
                aiMode: hasGemini ? 'gemini' : 'smart-db'
            }
        });
    })
};

module.exports = chatController;