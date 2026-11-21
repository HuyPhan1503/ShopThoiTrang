import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency } from './ProductCard';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
const PRODUCT_PREFIX = '/products';

const resolveImg = (url) => {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
};

const QUICK_PROMPTS = [
    { label: '📏 Tư vấn size (1m72, 68kg)', text: 'Mình cao 1m72 nặng 68kg mặc size gì?' },
    { label: '👔 Tìm đồ dưới 400k', text: 'Gợi ý sản phẩm dưới 400k đang còn hàng' },
    { label: '🎟️ Mã giảm giá', text: 'Shop hiện có mã giảm giá nào không?' },
    { label: '📦 Tra cứu đơn DH000013', text: 'Kiểm tra đơn hàng DH000013' },
    { label: '🔄 Chính sách đổi trả', text: 'Chính sách đổi trả và giao hàng của shop thế nào?' }
];

const WELCOME_MSG = {
    id: 'welcome',
    role: 'bot',
    text: 'Xin chào! Mình là **Trợ lý AI ShopThoiTrang**.\nMình có thể tư vấn **size theo chiều cao & cân nặng**, gợi ý **sản phẩm trong kho**, tra cứu **đơn hàng** và gửi **mã giảm giá** cho bạn.',
    products: [],
    vouchers: [],
    orderInfo: null,
    recommendedSize: null
};

const renderText = (text) =>
    String(text || '').split('\n').map((line, i) => (
        <div key={i} style={{ minHeight: line === '' ? '8px' : undefined }}>
            {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                    ? <strong key={j}>{part.slice(2, -2)}</strong>
                    : <span key={j}>{part}</span>
            )}
        </div>
    ));

const ChatboxWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [copiedCode, setCopiedCode] = useState('');
    const endRef = useRef(null);

    useEffect(() => {
        if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen, sending]);

    const handleSend = async (preset) => {
        const text = (preset !== undefined ? preset : input).trim();
        if (!text || sending) return;

        const next = [...messages, { id: `u_${Date.now()}`, role: 'user', text }];
        setMessages(next);
        if (preset === undefined) setInput('');
        setSending(true);

        try {
            const history = next.filter((m) => m.id !== 'welcome').slice(-6).map((m) => ({ role: m.role, text: m.text }));
            const res = await api.post('/chat', { message: text, history });
            const data = res?.data || {};
            setMessages((prev) => [
                ...prev,
                {
                    id: `b_${Date.now()}`,
                    role: 'bot',
                    text: data.reply || 'Mình đã nhận được tin nhắn của bạn.',
                    products: data.products || [],
                    vouchers: data.vouchers || [],
                    orderInfo: data.orderInfo || null,
                    recommendedSize: data.recommendedSize || null
                }
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { id: `e_${Date.now()}`, role: 'bot', text: `Hệ thống đang bận (${err.message}). Bạn thử lại nhé!` }
            ]);
        } finally {
            setSending(false);
        }
    };

    const copyVoucher = (code) => {
        navigator.clipboard?.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(''), 2000);
    };

    return (
        <div style={{ position: 'fixed', right: '22px', bottom: '22px', zIndex: 9999 }}>
            {isOpen && (
                <div style={{
                    width: '385px', maxWidth: 'calc(100vw - 28px)', height: '550px', maxHeight: 'calc(100vh - 105px)',
                    background: '#fff', borderRadius: '16px', boxShadow: '0 18px 45px rgba(15,23,42,0.22)',
                    border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '12px'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff',
                        padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%', background: '#e11d48',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px'
                            }}>AI</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '14px' }}>Trợ lý ShopThoiTrang</div>
                                <div style={{ fontSize: '11.5px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
                                    Tư vấn size, tồn kho & đơn hàng 24/7
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" onClick={() => setMessages([WELCOME_MSG])} style={{
                                background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
                                borderRadius: '8px', padding: '5px 8px', fontSize: '11.5px', cursor: 'pointer'
                            }}>Mới</button>
                            <button type="button" onClick={() => setIsOpen(false)} style={{
                                background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
                                borderRadius: '8px', width: '28px', height: '28px', fontSize: '16px', cursor: 'pointer'
                            }}>×</button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {messages.map((msg) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '8px' }}>
                                    <div style={{
                                        maxWidth: '86%', padding: '10px 13px',
                                        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                        background: isUser ? '#0f172a' : '#fff', color: isUser ? '#fff' : '#1e293b',
                                        border: isUser ? 'none' : '1px solid #e2e8f0', fontSize: '13.5px', lineHeight: 1.5
                                    }}>
                                        {renderText(msg.text)}
                                    </div>

                                    {msg.recommendedSize && (
                                        <div style={{
                                            maxWidth: '86%', background: '#ecfdf5', border: '1px solid #a7f3d0',
                                            color: '#065f46', borderRadius: '10px', padding: '8px 12px', fontSize: '12.5px', fontWeight: 600
                                        }}>
                                            Size đề xuất: <span style={{ fontSize: '14px' }}>{msg.recommendedSize.size}</span>
                                            {msg.recommendedSize.altSize ? ` (Form rộng: ${msg.recommendedSize.altSize})` : ''}
                                        </div>
                                    )}

                                    {msg.orderInfo && (
                                        <div style={{ width: '86%', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', fontSize: '12.5px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                                <strong>Đơn #{msg.orderInfo.maDon}</strong>
                                                <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, fontSize: '11.5px' }}>
                                                    {msg.orderInfo.trangThaiText}
                                                </span>
                                            </div>
                                            <div>Tổng tiền: <strong>{formatCurrency(msg.orderInfo.tongTien)}</strong> ({msg.orderInfo.soMatHang} sp)</div>
                                            <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: '2px' }}>{msg.orderInfo.phuongThuc}</div>
                                        </div>
                                    )}

                                    {msg.vouchers?.length > 0 && (
                                        <div style={{ width: '88%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {msg.vouchers.map((v) => (
                                                <div key={v.voucherId} style={{
                                                    background: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: '10px',
                                                    padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                                                }}>
                                                    <div style={{ fontSize: '12px' }}>
                                                        <div style={{ fontWeight: 800, color: '#b45309' }}>{v.maCode}</div>
                                                        <div style={{ color: '#78350f' }}>
                                                            {v.moTa || (v.loaiGiam === 'PHAN_TRAM' ? `Giảm ${v.giaTriGiam}%` : `Giảm ${formatCurrency(v.giaTriGiam)}`)}
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => copyVoucher(v.maCode)} style={{
                                                        border: 'none', background: copiedCode === v.maCode ? '#10b981' : '#f59e0b',
                                                        color: '#fff', borderRadius: '6px', padding: '5px 9px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer'
                                                    }}>
                                                        {copiedCode === v.maCode ? 'Đã chép ✓' : 'Sao chép'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.products?.length > 0 && (
                                        <div style={{ width: '90%', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                            {msg.products.map((sp) => (
                                                <Link key={sp.SanPhamId} to={`${PRODUCT_PREFIX}/${sp.SanPhamId}`} style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px', background: '#fff',
                                                    border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', textDecoration: 'none', color: 'inherit'
                                                }}>
                                                    {sp.AnhUrl && (
                                                        <img src={resolveImg(sp.AnhUrl)} alt={sp.TenSanPham} onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                                                    )}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {sp.TenSanPham}
                                                        </div>
                                                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                            Size sẵn: {sp.SizesConHang || 'Đủ size'}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                                                            <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#e11d48' }}>{formatCurrency(sp.Gia)}</span>
                                                            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>Xem chi tiết →</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {sending && (
                            <div style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px 14px 14px 4px', padding: '9px 13px', fontSize: '12.5px', color: '#64748b' }}>
                                Đang kiểm tra dữ liệu cửa hàng...
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    <div style={{ padding: '8px 10px', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                        {QUICK_PROMPTS.map((q) => (
                            <button key={q.label} type="button" disabled={sending} onClick={() => handleSend(q.text)} style={{
                                border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155',
                                borderRadius: '999px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', flexShrink: 0
                            }}>
                                {q.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ padding: '10px 12px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Nhập chiều cao, cân nặng, mã đơn..."
                            disabled={sending}
                            style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '999px', padding: '8px 14px', fontSize: '13px', outline: 'none' }}
                        />
                        <button type="submit" disabled={sending || !input.trim()} style={{
                            border: 'none', borderRadius: '999px', background: sending || !input.trim() ? '#94a3b8' : '#e11d48',
                            color: '#fff', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer'
                        }}>
                            Gửi
                        </button>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsOpen((v) => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff',
                    border: '2px solid rgba(255,255,255,0.15)', borderRadius: '999px', padding: '12px 18px',
                    boxShadow: '0 10px 25px rgba(15,23,42,0.28)', cursor: 'pointer', fontWeight: 700, fontSize: '14px'
                }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.25)' }} />
                    <span>{isOpen ? 'Đóng trợ lý AI' : 'Trợ lý AI tư vấn'}</span>
                </button>
            </div>
        </div>
    );
};

export default ChatboxWidget;