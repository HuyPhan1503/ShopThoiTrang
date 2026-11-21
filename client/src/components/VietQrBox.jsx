import { useState } from 'react';
import api from '../services/api';
import { formatCurrency } from './ProductCard';

const VietQrBox = ({ vietQr, onPaymentConfirmed }) => {
    const [copiedField, setCopiedField] = useState('');
    const [simulating, setSimulating] = useState(false);
    const [webhookError, setWebhookError] = useState('');

    if (!vietQr) return null;

    const handleCopy = (label, text) => {
        navigator.clipboard?.writeText(String(text));
        setCopiedField(label);
        setTimeout(() => setCopiedField(''), 2000);
    };

    const handleSimulateBankWebhook = async () => {
        setSimulating(true);
        setWebhookError('');
        try {
            const res = await api.post('/orders/webhook/bank-transfer', {
                gateway: 'VietinBank (Sandbox)',
                transferType: 'in',
                transferAmount: Number(vietQr.amount),
                content: vietQr.addInfo,
                sandbox: true
            });
            if (onPaymentConfirmed && res?.data) {
                onPaymentConfirmed(res.data, res.message);
            }
        } catch (err) {
            setWebhookError(err.message || 'Không thể giả lập nhận tiền chuyển khoản.');
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div
            style={{
                marginTop: '18px',
                padding: '18px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                textAlign: 'left'
            }}
        >
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '4px', textAlign: 'center' }}>
                Thanh toán chuyển khoản nhanh qua VietQR
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px', textAlign: 'center' }}>
                Mở ứng dụng ngân hàng và quét mã bên dưới — hệ thống tự động nhận diện giao dịch, duyệt đơn và bàn giao đơn vị vận chuyển ngay khi nhận tiền.
            </p>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '18px',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <img
                    src={vietQr.qrUrl}
                    alt={`Mã VietQR ${vietQr.addInfo}`}
                    style={{
                        width: '215px',
                        maxWidth: '100%',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        padding: '6px'
                    }}
                />

                <div style={{ flex: '1 1 240px', display: 'grid', gap: '8px', fontSize: '13px' }}>
                    <div style={{ padding: '8px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Ngân hàng thụ hưởng</div>
                        <strong>{vietQr.bankName}</strong>
                    </div>

                    <div
                        style={{
                            padding: '8px 10px',
                            background: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Số tài khoản ({vietQr.accountName})</div>
                            <strong>{vietQr.accountNo}</strong>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleCopy('stk', vietQr.accountNo)}
                        >
                            {copiedField === 'stk' ? 'Đã chép' : 'Sao chép'}
                        </button>
                    </div>

                    <div
                        style={{
                            padding: '8px 10px',
                            background: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Số tiền thanh toán</div>
                            <strong style={{ color: 'var(--accent)', fontSize: '15px' }}>{formatCurrency(vietQr.amount)}</strong>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleCopy('amount', vietQr.amount)}
                        >
                            {copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}
                        </button>
                    </div>

                    <div
                        style={{
                            padding: '8px 10px',
                            background: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Nội dung chuyển khoản (bắt buộc)</div>
                            <strong style={{ color: '#0284c7', fontSize: '15px' }}>{vietQr.addInfo}</strong>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleCopy('note', vietQr.addInfo)}
                        >
                            {copiedField === 'note' ? 'Đã chép' : 'Sao chép'}
                        </button>
                    </div>
                </div>
            </div>

            {webhookError && (
                <div className="alert alert-error" style={{ marginTop: '12px', marginBottom: 0 }}>
                    {webhookError}
                </div>
            )}

            {/* Thanh trạng thái tự động đối soát & Nút test Sandbox */}
            <div
                style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    background: '#eff6ff',
                    border: '1px dashed #93c5fd',
                    borderRadius: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >
                <div style={{ fontSize: '12.5px', color: '#1e40af', fontWeight: 600 }}>
                    ⏳ Hệ thống đang tự động chờ tín hiệu biến động số dư từ ngân hàng...
                </div>

                <button
                    type="button"
                    disabled={simulating}
                    onClick={handleSimulateBankWebhook}
                    style={{
                        border: 'none',
                        borderRadius: '6px',
                        background: '#059669',
                        color: '#ffffff',
                        padding: '7px 13px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    {simulating ? 'Đang xử lý Webhook...' : '⚡ Giả lập ngân hàng báo nhận tiền (Sandbox)'}
                </button>
            </div>
        </div>
    );
};

export default VietQrBox;