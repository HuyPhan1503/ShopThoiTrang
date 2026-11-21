const orderService = require('../services/orderService');
const orderAutomationService = require('../services/orderAutomationService');
const asyncHandler = require('../utils/asyncHandler');

const orderController = {
    placeOrder: asyncHandler(async (req, res) => {
        const order = await orderService.placeOrder(req.user || null, req.body);
        res.status(201).json({
            success: true,
            message: order.autoConfirmed
                ? 'Đặt hàng thành công! Đơn hàng COD đã được hệ thống tự động xác nhận.'
                : 'Đặt hàng thành công.',
            data: order
        });
    }),

    trackOrder: asyncHandler(async (req, res) => {
        const { maDon, soDienThoai } = req.query;
        const order = await orderService.trackOrder(maDon, soDienThoai);
        res.json({ success: true, data: order });
    }),

    getMyOrders: asyncHandler(async (req, res) => {
        const orders = await orderService.getMyOrders(req.user.id);
        res.json({ success: true, data: orders });
    }),

    getOrderById: asyncHandler(async (req, res) => {
        const order = await orderService.getOrderDetail(req.params.id, req.user);
        res.json({ success: true, data: order });
    }),

    getAllOrders: asyncHandler(async (req, res) => {
        const result = await orderService.getAllOrders(req.query);
        res.json({
            success: true,
            data: result.items,
            pagination: result.pagination
        });
    }),

    shipOrder: asyncHandler(async (req, res) => {
        const updated = await orderService.shipOrder(req.params.id, req.body || {});
        res.json({
            success: true,
            message: `Đã bàn giao đơn hàng cho ${updated.DonViVanChuyen} (Mã vận đơn: ${updated.MaVanDon}).`,
            data: updated
        });
    }),

    updateOrderStatus: asyncHandler(async (req, res) => {
        const updated = await orderService.updateOrderStatus(req.params.id, req.body.trangThai);
        res.json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công.',
            data: updated
        });
    }),

    bulkUpdateStatus: asyncHandler(async (req, res) => {
        const { ids, trangThai } = req.body || {};
        const result = await orderService.bulkUpdateStatus(ids, trangThai);
        res.json({
            success: true,
            message: `Đã xử lý thành công ${result.updatedCount} đơn hàng${result.skippedCount > 0 ? ` (bỏ qua ${result.skippedCount} đơn không hợp lệ bước chuyển)` : ''}.`,
            data: result
        });
    }),

    confirmReceived: asyncHandler(async (req, res) => {
        const updated = await orderService.confirmOrderReceived(req.params.id, req.user);
        res.json({
            success: true,
            message: 'Cảm ơn bạn đã xác nhận nhận được hàng! Bạn có thể đánh giá sản phẩm ngay bên dưới.',
            data: updated
        });
    }),

    requestRefund: asyncHandler(async (req, res) => {
        const updated = await orderService.requestRefund(req.params.id, req.user, req.body?.lyDoHoanTien);
        res.json({
            success: true,
            message: 'Đã gửi yêu cầu Trả hàng / Hoàn tiền. Cửa hàng sẽ phản hồi trong thời gian sớm nhất.',
            data: updated
        });
    }),

    processRefund: asyncHandler(async (req, res) => {
        const updated = await orderService.processRefund(req.params.id, req.body || {});
        res.json({
            success: true,
            message:
                req.body?.action === 'APPROVE'
                    ? 'Đã chấp nhận hoàn tiền và cộng trả tồn kho thành công.'
                    : 'Đã từ chối yêu cầu hoàn tiền.',
            data: updated
        });
    }),

    cancelOrder: asyncHandler(async (req, res) => {
        const updated = await orderService.cancelOrder(req.params.id, req.user);
        res.json({
            success: true,
            message: 'Hủy đơn hàng và hoàn trả tồn kho thành công.',
            data: updated
        });
    }),

    getDashboardStats: asyncHandler(async (req, res) => {
        const stats = await orderService.getDashboardStats();
        res.json({ success: true, data: stats });
    }),

    getAutomationConfig: asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: orderAutomationService.getStatus()
        });
    }),

    updateAutomationConfig: asyncHandler(async (req, res) => {
        const config = orderAutomationService.updateConfig(req.body || {});
        res.json({
            success: true,
            message: 'Đã lưu cấu hình tự động hóa xử lý đơn hàng.',
            data: {
                ...orderAutomationService.getStatus(),
                config
            }
        });
    }),

    runAutomationNow: asyncHandler(async (req, res) => {
        const summary = await orderAutomationService.runScheduledTasks();
        res.json({
            success: true,
            message: `Hoàn tất kiểm tra tự động: hủy ${summary.autoCancelledCount} đơn quá hạn CK, hoàn thành ${summary.autoCompletedCount} đơn đã giao.`,
            data: summary
        });
    }),

    bankTransferWebhook: asyncHandler(async (req, res) => {
        const result = await orderAutomationService.handleBankTransferWebhook(req.body || {});
        if (result.ignored) {
            return res.json({ success: true, message: result.reason });
        }
        const ord = result.order;
        res.json({
            success: true,
            message: result.alreadyProcessed
                ? `Đơn hàng #${ord.MaDon} đã được thanh toán và xử lý trước đó.`
                : result.autoShipped
                ? `Đã nhận tiền chuyển khoản! Hệ thống tự động lên đơn #${ord.MaDon} và bàn giao cho ${ord.DonViVanChuyen} (Mã vận đơn: ${ord.MaVanDon}).`
                : `Đã nhận tiền chuyển khoản và tự động duyệt đơn hàng #${ord.MaDon}.`,
            data: ord
        });
    }),

    reconcileTransfer: asyncHandler(async (req, res) => {
        const { maDon } = req.body || {};
        const result = await orderAutomationService.reconcileBankTransfers(maDon);
        res.json({
            success: true,
            message:
                result.matchedCount > 0
                    ? `Đã đối soát thanh toán và tự động duyệt ${result.matchedCount} đơn chuyển khoản!`
                    : 'Không có đơn chuyển khoản chờ xác nhận nào khớp yêu cầu.',
            data: result
        });
    })
};

module.exports = orderController;