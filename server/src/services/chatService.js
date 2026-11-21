const { pool } = require('../config/database');

const STATUS_TEXT = {
    CHO_XAC_NHAN: 'Chờ xác nhận',
    DA_XAC_NHAN: 'Đã xác nhận',
    DANG_GIAO: 'Đang giao hàng',
    HOAN_THANH: 'Hoàn thành',
    DA_HUY: 'Đã hủy'
};

const PAYMENT_TEXT = {
    COD: 'Thanh toán khi nhận hàng (COD)',
    CHUYEN_KHOAN: 'Chuyển khoản ngân hàng (VietQR)'
};

const formatVnd = (amount) =>
    `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount) || 0))} đ`;

function parseBodyMeasurements(text) {
    let heightCm = null;
    let weightKg = null;

    // Nhận diện chiều cao: 1m72, 1m7, 1.72m, 172cm, cao 172
    const mHeight1 = text.match(/\b1\s*[m.,]\s*(\d{1,2})\b/i);
    const mHeight2 = text.match(/\b(1[4-9]\d|20\d)\s*cm\b/i);
    const mHeight3 = text.match(/cao\s*(?:khoảng|tầm)?\s*(1[4-9]\d|20\d)\b/i);

    if (mHeight1) {
        const sub = mHeight1[1].length === 1 ? Number(mHeight1[1]) * 10 : Number(mHeight1[1]);
        heightCm = 100 + sub;
    } else if (mHeight2) {
        heightCm = Number(mHeight2[1]);
    } else if (mHeight3) {
        heightCm = Number(mHeight3[1]);
    }

    // Nhận diện cân nặng: 68kg, 68 kg, nặng 65, 65 cân
    const mWeight1 = text.match(/\b(\d{2,3})\s*(?:kg|ký|cân)\b/i);
    const mWeight2 = text.match(/nặng\s*(?:khoảng|tầm)?\s*(\d{2,3})\b/i);

    if (mWeight1) {
        weightKg = Number(mWeight1[1]);
    } else if (mWeight2) {
        weightKg = Number(mWeight2[1]);
    }

    // Nhận diện hỏi trực tiếp size (vd: "còn size L không", "mẫu size M")
    const mExplicitSize = text.match(/\bsize\s*(XS|S|M|L|XL|XXL|28|29|30|31|32|33|34)\b/i);
    const explicitSize = mExplicitSize ? mExplicitSize[1].toUpperCase() : null;

    if (!heightCm && !weightKg && !explicitSize) return null;

    if (!heightCm && !weightKg && explicitSize) {
        return {
            size: explicitSize,
            altSize: null,
            heightCm: null,
            weightKg: null,
            reason: `Bạn đang tìm các mẫu còn sẵn size ${explicitSize} tại cửa hàng.`
        };
    }

    // Tính size chuẩn theo chiều cao & cân nặng người Việt
    const h = heightCm || 168;
    const w = weightKg || 60;
    const bmi = w / Math.pow(h / 100, 2);

    let size = 'M';
    let altSize = 'L';

    if (w < 48 && h < 160) {
        size = 'S';
        altSize = 'M';
    } else if (w <= 56 && h <= 168) {
        size = 'S';
        altSize = 'M';
    } else if (w <= 65 && h <= 174) {
        size = 'M';
        altSize = 'L';
    } else if (w <= 75 && h <= 180) {
        size = 'L';
        altSize = 'XL';
    } else {
        size = 'XL';
        altSize = 'XXL';
    }

    // Điều chỉnh nếu dáng người đậm (BMI >= 25)
    if (bmi >= 25 && size === 'S') {
        size = 'M';
        altSize = 'L';
    } else if (bmi >= 25.5 && size === 'M') {
        size = 'L';
        altSize = 'XL';
    } else if (bmi >= 26.5 && size === 'L') {
        size = 'XL';
        altSize = 'XXL';
    }

    const descParts = [];
    if (heightCm) descParts.push(`cao ${heightCm}cm`);
    if (weightKg) descParts.push(`nặng ${weightKg}kg`);

    return {
        size,
        altSize,
        heightCm,
        weightKg,
        reason: `Với số đo ${descParts.join(', ')}, bạn mặc chuẩn nhất là size ${size} (hoặc chọn size ${altSize} nếu thích form rộng thoải mái).`
    };
}

function parsePriceFilter(text) {
    const normalized = text.toLowerCase().replace(/\./g, '').replace(/,/g, '');

    const toVnd = (numStr, unitStr) => {
        const val = Number(numStr);
        if (!val || Number.isNaN(val)) return null;
        const unit = (unitStr || '').trim();
        if (unit.startsWith('tr')) return val * 1000000;
        if (unit === 'k' || unit.startsWith('nghìn') || unit.startsWith('ngàn')) return val * 1000;
        if (val < 1000) return val * 1000; // vd: "dưới 400" -> 400.000đ
        return val;
    };

    // Khoảng giá: từ 200k đến 400k / 200k - 500k
    const rangeMatch = normalized.match(
        /(?:từ\s*)?(\d+(?:\.\d+)?)\s*(k|nghìn|ngàn|tr|triệu|đ|vnđ)?\s*(?:đến|tới|-|~)\s*(\d+(?:\.\d+)?)\s*(k|nghìn|ngàn|tr|triệu|đ|vnđ)?/
    );
    if (rangeMatch) {
        const min = toVnd(rangeMatch[1], rangeMatch[2] || rangeMatch[4]);
        const max = toVnd(rangeMatch[3], rangeMatch[4] || rangeMatch[2]);
        if (min && max && max >= min) return { minPrice: min, maxPrice: max };
    }

    // Dưới X: dưới 400k, < 500k, tối đa 300k
    const underMatch = normalized.match(
        /(?:dưới|nhỏ hơn|ít hơn|tối đa|không quá|<)\s*(\d+(?:\.\d+)?)\s*(k|nghìn|ngàn|tr|triệu|đ|vnđ)?/
    );
    if (underMatch) {
        const max = toVnd(underMatch[1], underMatch[2]);
        if (max) return { minPrice: null, maxPrice: max };
    }

    // Trên X: trên 500k, > 300k, từ 400k
    const overMatch = normalized.match(
        /(?:trên|lớn hơn|hơn|tối thiểu|>)\s*(\d+(?:\.\d+)?)\s*(k|nghìn|ngàn|tr|triệu|đ|vnđ)?/
    );
    if (overMatch) {
        const min = toVnd(overMatch[1], overMatch[2]);
        if (min) return { minPrice: min, maxPrice: null };
    }

    // Tầm / khoảng X: tầm 350k
    const aroundMatch = normalized.match(
        /(?:tầm|khoảng|quanh)\s*(\d+(?:\.\d+)?)\s*(k|nghìn|ngàn|tr|triệu|đ|vnđ)?/
    );
    if (aroundMatch) {
        const mid = toVnd(aroundMatch[1], aroundMatch[2]);
        if (mid) return { minPrice: Math.max(0, mid - 120000), maxPrice: mid + 120000 };
    }

    return null;
}

function extractProductKeywords(text) {
    const stopWords = new Set([
        'tìm', 'cho', 'mình', 'em', 'anh', 'chị', 'bạn', 'shop', 'cửa', 'hàng', 'có', 'không',
        'nào', 'gì', 'với', 'và', 'hoặc', 'là', 'của', 'những', 'các', 'mẫu', 'sản', 'phẩm',
        'đồ', 'mặc', 'đi', 'giá', 'dưới', 'trên', 'tầm', 'khoảng', 'từ', 'đến', 'gợi', 'ý',
        'tư', 'vấn', 'mua', 'cần', 'xem', 'nhé', 'ạ', 'ơi', 'nhỉ', 'giúp', 'size', 'cao', 'nặng',
        'kg', 'cm', 'mặc', 'vừa', 'còn', 'hàng', 'bán', 'chạy', 'mới', 'nhất', 'đẹp', 'rẻ'
    ]);

    const cleaned = text
        .toLowerCase()
        .replace(/1\s*[m.,]\s*\d{1,2}/g, ' ')
        .replace(/\b\d+\s*(kg|cm|k|nghìn|ngàn|tr|triệu|đ|vnđ)?\b/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ');

    const tokens = cleaned
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !stopWords.has(t));

    // Giữ các cụm từ thời trang phổ biến
    const phrases = [];
    const commonPhrases = [
        'công sở', 'thể thao', 'quần tây', 'quần jean', 'quần short', 'áo thun',
        'áo sơ mi', 'áo khoác', 'áo polo', 'váy đầm', 'chân váy', 'giày dép', 'phụ kiện'
    ];
    for (const p of commonPhrases) {
        if (cleaned.includes(p)) phrases.push(p);
    }

    return Array.from(new Set([...phrases, ...tokens])).slice(0, 5);
}

async function queryMatchingProducts({ sizeInfo, priceFilter, keywords, askSuggest }) {
    const conditions = ["sp.TrangThai = 'DANG_BAN'"];
    const params = [];

    if (priceFilter?.minPrice != null) {
        conditions.push('sp.Gia >= ?');
        params.push(priceFilter.minPrice);
    }
    if (priceFilter?.maxPrice != null) {
        conditions.push('sp.Gia <= ?');
        params.push(priceFilter.maxPrice);
    }

    if (sizeInfo?.size) {
        conditions.push(
            'EXISTS (SELECT 1 FROM bien_the bt2 WHERE bt2.SanPhamId = sp.SanPhamId AND UPPER(bt2.Size) = ? AND bt2.SoLuongTon > 0)'
        );
        params.push(sizeInfo.size);
    }

    if (keywords.length > 0) {
        const kwClauses = keywords.map(
            () => '(sp.TenSanPham LIKE ? OR sp.MoTa LIKE ? OR dm.TenDanhMuc LIKE ?)'
        );
        conditions.push(`(${kwClauses.join(' OR ')})`);
        for (const kw of keywords) {
            const pattern = `%${kw}%`;
            params.push(pattern, pattern, pattern);
        }
    }

    const shouldQuery = Boolean(sizeInfo || priceFilter || keywords.length > 0 || askSuggest);
    if (!shouldQuery) return [];

    const sql = `
        SELECT
            sp.SanPhamId,
            sp.TenSanPham,
            sp.Gia,
            sp.AnhUrl,
            dm.TenDanhMuc,
            COALESCE(SUM(bt.SoLuongTon), 0) AS TongTon,
            GROUP_CONCAT(
                DISTINCT CASE WHEN bt.SoLuongTon > 0 THEN bt.Size END
                ORDER BY FIELD(bt.Size, 'XS','S','M','L','XL','XXL','28','29','30','31','32','33','34')
                SEPARATOR ', '
            ) AS SizesConHang
        FROM san_pham sp
        LEFT JOIN danh_muc dm ON sp.DanhMucId = dm.DanhMucId
        LEFT JOIN bien_the bt ON sp.SanPhamId = bt.SanPhamId
        WHERE ${conditions.join(' AND ')}
        GROUP BY sp.SanPhamId, sp.TenSanPham, sp.Gia, sp.AnhUrl, dm.TenDanhMuc
        HAVING TongTon > 0
        ORDER BY sp.NgayTao DESC
        LIMIT 4
    `;

    const [rows] = await pool.query(sql, params);

    // Nếu lọc quá chặt không ra kết quả, lấy 3 sản phẩm đang bán để gợi ý thay thế
    if (rows.length === 0 && (keywords.length > 0 || priceFilter)) {
        const [fallbackRows] = await pool.query(`
            SELECT
                sp.SanPhamId,
                sp.TenSanPham,
                sp.Gia,
                sp.AnhUrl,
                dm.TenDanhMuc,
                COALESCE(SUM(bt.SoLuongTon), 0) AS TongTon,
                GROUP_CONCAT(
                    DISTINCT CASE WHEN bt.SoLuongTon > 0 THEN bt.Size END
                    ORDER BY FIELD(bt.Size, 'XS','S','M','L','XL','XXL','28','29','30','31','32','33','34')
                    SEPARATOR ', '
                ) AS SizesConHang
            FROM san_pham sp
            LEFT JOIN danh_muc dm ON sp.DanhMucId = dm.DanhMucId
            LEFT JOIN bien_the bt ON sp.SanPhamId = bt.SanPhamId
            WHERE sp.TrangThai = 'DANG_BAN'
            GROUP BY sp.SanPhamId, sp.TenSanPham, sp.Gia, sp.AnhUrl, dm.TenDanhMuc
            HAVING TongTon > 0
            ORDER BY sp.NgayTao DESC
            LIMIT 3
        `);
        return fallbackRows.map((r) => ({
            ...r,
            Gia: Number(r.Gia || 0),
            TongTon: Number(r.TongTon || 0),
            isFallback: true
        }));
    }

    return rows.map((r) => ({
        ...r,
        Gia: Number(r.Gia || 0),
        TongTon: Number(r.TongTon || 0),
        isFallback: false
    }));
}

async function queryOrderByCode(text) {
    const match = text.match(/\b(DH\d{1,10})\b/i);
    if (!match) return null;

    const maDon = match[1].toUpperCase();
    const [rows] = await pool.query(
        `
        SELECT
            dh.DonHangId,
            dh.MaDon,
            dh.HoTenNhan,
            dh.TongTien,
            dh.PhuongThucThanhToan,
            dh.TrangThai,
            dh.NgayDat,
            COUNT(ct.ChiTietId) AS SoMatHang
        FROM don_hang dh
        LEFT JOIN chi_tiet_don_hang ct ON dh.DonHangId = ct.DonHangId
        WHERE dh.MaDon = ?
        GROUP BY dh.DonHangId, dh.MaDon, dh.HoTenNhan, dh.TongTien, dh.PhuongThucThanhToan, dh.TrangThai, dh.NgayDat
        LIMIT 1
        `,
        [maDon]
    );

    if (rows.length === 0) {
        return { notFound: true, maDon };
    }

    const row = rows[0];
    return {
        notFound: false,
        maDon: row.MaDon,
        hoTenNhan: row.HoTenNhan,
        tongTien: Number(row.TongTien || 0),
        phuongThuc: PAYMENT_TEXT[row.PhuongThucThanhToan] || row.PhuongThucThanhToan,
        trangThai: row.TrangThai,
        trangThaiText: STATUS_TEXT[row.TrangThai] || row.TrangThai,
        ngayDat: row.NgayDat,
        soMatHang: Number(row.SoMatHang || 0)
    };
}

async function queryActiveVouchers() {
    const [rows] = await pool.query(`
        SELECT
            VoucherId,
            MaCode,
            MoTa,
            LoaiGiam,
            GiaTriGiam,
            GiamToiDa,
            DonToiThieu,
            SoLuong,
            DaSuDung,
            NgayKetThuc
        FROM ma_giam_gia
        WHERE TrangThai = 1
          AND (NgayBatDau IS NULL OR NgayBatDau <= NOW())
          AND (NgayKetThuc IS NULL OR NgayKetThuc >= NOW())
          AND (SoLuong IS NULL OR DaSuDung < SoLuong)
        ORDER BY GiaTriGiam DESC
        LIMIT 5
    `);

    return rows.map((v) => ({
        voucherId: v.VoucherId,
        maCode: v.MaCode,
        moTa: v.MoTa,
        loaiGiam: v.LoaiGiam,
        giaTriGiam: Number(v.GiaTriGiam || 0),
        giamToiDa: v.GiamToiDa ? Number(v.GiamToiDa) : null,
        donToiThieu: Number(v.DonToiThieu || 0),
        conLai: v.SoLuong != null ? Math.max(0, Number(v.SoLuong) - Number(v.DaSuDung || 0)) : null,
        ngayKetThuc: v.NgayKetThuc
    }));
}

async function queryFaqs(text) {
    const [rows] = await pool.query(`
        SELECT ChuDe, CauHoi, TraLoi
        FROM cau_hoi_thuong_gap
        WHERE HienThi = 1
        ORDER BY ThuTu ASC
    `);

    if (rows.length === 0) return [];

    const lower = text.toLowerCase();
    const matched = rows.filter((f) => {
        const q = `${f.ChuDe} ${f.CauHoi}`.toLowerCase();
        if (lower.includes('đổi') || lower.includes('trả')) return q.includes('đổi') || q.includes('trả');
        if (lower.includes('ship') || lower.includes('giao') || lower.includes('vận chuyển'))
            return q.includes('giao') || q.includes('ship');
        if (lower.includes('thanh toán') || lower.includes('vietqr') || lower.includes('chuyển khoản') || lower.includes('cod'))
            return q.includes('thanh toán') || q.includes('chuyển khoản');
        if (lower.includes('tài khoản') || lower.includes('đăng ký') || lower.includes('mật khẩu'))
            return q.includes('tài khoản');
        return false;
    });

    return (matched.length > 0 ? matched : rows).slice(0, 3);
}

function buildRuleBasedReply({ message, sizeInfo, products, orderInfo, vouchers, faqs, askOrder, askPolicy }) {
    const parts = [];

    if (orderInfo) {
        if (orderInfo.notFound) {
            parts.push(
                `Mình chưa tìm thấy đơn hàng **${orderInfo.maDon}** trong hệ thống. Bạn kiểm tra lại đúng định dạng mã đơn (ví dụ: **DH000013**) giúp mình nhé!`
            );
        } else {
            parts.push(
                `Đơn hàng **#${orderInfo.maDon}** của khách **${orderInfo.hoTenNhan}** hiện đang ở trạng thái **${orderInfo.trangThaiText}** (Tổng thanh toán: **${formatVnd(orderInfo.tongTien)}** — ${orderInfo.phuongThuc}).`
            );
        }
    } else if (askOrder) {
        parts.push(
            'Để tra cứu nhanh tình trạng đơn hàng, bạn chỉ cần nhắn trực tiếp **mã đơn hàng** vào đây (ví dụ: **DH000013**) là mình kiểm tra ngay cho bạn nhé!'
        );
    }

    if (sizeInfo) {
        parts.push(sizeInfo.reason);
        if (products.length > 0 && !products[0].isFallback) {
            parts.push(`Dưới đây là các mẫu hiện đang còn sẵn **size ${sizeInfo.size}** trong kho để bạn chọn:`);
        } else {
            parts.push(`Hiện kho đang tạm hết size ${sizeInfo.size} cho mẫu bạn tìm, mình gợi ý thêm vài mẫu khác đang sẵn hàng bên dưới nhé:`);
        }
    } else if (products.length > 0) {
        if (products[0].isFallback) {
            parts.push('Chưa có mẫu nào khớp chính xác hoàn toàn, nhưng mình gợi ý cho bạn các mẫu đang bán chạy và còn sẵn hàng tại **ShopThoiTrang**:');
        } else {
            parts.push('Mình tìm thấy các sản phẩm phù hợp và đang còn hàng tại **ShopThoiTrang** cho bạn đây:');
        }
    }

    if (vouchers.length > 0) {
        parts.push(
            `Hiện shop đang có **${vouchers.length} mã giảm giá** còn hiệu lực. Bạn bấm **Sao chép** ở thẻ bên dưới và dán vào bước Thanh toán để được giảm trực tiếp nhé:`
        );
    }

    if (askPolicy) {
        if (faqs.length > 0) {
            const faqLines = faqs.map((f) => `• **${f.CauHoi}**: ${f.TraLoi}`).join('\n');
            parts.push(`Thông tin hỗ trợ dành cho bạn:\n${faqLines}`);
        }
        parts.push(
            'Nếu cần hỗ trợ gấp, bạn liên hệ trực tiếp **Hotline: 0389137130** (8:00 - 21:00) hoặc **Email: phanhuy150305@gmail.com** (Địa chỉ: Biên Hòa, Đồng Nai).'
        );
    }

    if (parts.length === 0) {
        parts.push(
            'Xin chào! Mình là **Trợ lý AI của ShopThoiTrang**. Mình có thể giúp bạn:\n' +
            '• **Tư vấn chọn size** theo chiều cao, cân nặng (vd: *"Cao 1m72 nặng 68kg mặc size gì?"*)\n' +
            '• **Tìm & gợi ý sản phẩm** theo mức giá hoặc phong cách (vd: *"Tìm đồ công sở dưới 400k"*)\n' +
            '• **Kiểm tra đơn hàng** (vd: *"Tra cứu đơn DH000013"*) & **lấy mã giảm giá** đang áp dụng.'
        );
    }

    return parts.join('\n\n');
}

async function generateGeminiReply({ message, history, contextSummary, fallbackReply }) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        return { text: fallbackReply, source: 'smart-db' };
    }

    const systemPrompt = [
        'Bạn là Trợ lý AI tư vấn thời trang & chăm sóc khách hàng của cửa hàng ShopThoiTrang (Địa chỉ: Biên Hòa, Đồng Nai; Hotline: 0389137130 từ 8:00 - 21:00; Email: phanhuy150305@gmail.com).',
        'Quy tắc trả lời:',
        '1. Trả lời bằng tiếng Việt tự nhiên, thân thiện, súc tích (3-5 câu), đi thẳng vào trọng tâm.',
        '2. Chỉ sử dụng đúng dữ liệu thực tế từ hệ thống ShopThoiTrang được cung cấp bên dưới. Tuyệt đối không tự bịa thêm tên sản phẩm, giá tiền, mã giảm giá hoặc trạng thái đơn hàng không có trong dữ liệu.',
        '3. Nếu có danh sách sản phẩm/voucher/đơn hàng bên dưới, hãy giới thiệu ngắn gọn vì giao diện chat đã tự động hiển thị thẻ sản phẩm/voucher trực quan ngay dưới câu trả lời của bạn.',
        '',
        '=== DỮ LIỆU THỰC TẾ TỪ DATABASE SHOPTHOITRANG ===',
        contextSummary
    ].join('\n');

    const contents = [];
    if (Array.isArray(history)) {
        for (const h of history.slice(-6)) {
            if (!h?.text) continue;
            contents.push({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: String(h.text).slice(0, 600) }]
            });
        }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000),
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents,
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 450
                    }
                })
            }
        );

        if (!res.ok) {
            return { text: fallbackReply, source: 'smart-db' };
        }

        const data = await res.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!aiText) {
            return { text: fallbackReply, source: 'smart-db' };
        }

        return { text: aiText, source: 'gemini' };
    } catch {
        return { text: fallbackReply, source: 'smart-db' };
    }
}

const chatService = {
    async handleMessage(rawMessage, history = []) {
        const message = String(rawMessage || '').trim();
        const lower = message.toLowerCase();

        const sizeInfo = parseBodyMeasurements(message);
        const priceFilter = parsePriceFilter(message);
        const keywords = extractProductKeywords(message);

        const askVoucher = /(voucher|mã giảm|khuyến mãi|ưu đãi|giảm giá|mã code)/i.test(lower);
        const askOrder = /(đơn hàng|tra cứu|kiểm tra đơn|mã đơn|dh\d+)/i.test(lower);
        const askPolicy = /(đổi trả|ship|giao hàng|vận chuyển|thanh toán|vietqr|chuyển khoản|cod|hotline|liên hệ|địa chỉ|chính sách)/i.test(lower);
        const askSuggest = /(gợi ý|tư vấn|sản phẩm|quần|áo|váy|đầm|giày|phụ kiện|mẫu|bán chạy|phối đồ|mặc gì)/i.test(lower);

        const [orderInfo, vouchers, faqs] = await Promise.all([
            queryOrderByCode(message),
            askVoucher ? queryActiveVouchers() : Promise.resolve([]),
            askPolicy ? queryFaqs(message) : Promise.resolve([])
        ]);

        // Chỉ truy vấn sản phẩm nếu không phải câu hỏi thuần tra cứu đơn hoặc thuần hỏi voucher
        const shouldSearchProducts =
            Boolean(sizeInfo || priceFilter || keywords.length > 0 || askSuggest) &&
            !(orderInfo && !sizeInfo && !priceFilter && !askSuggest);

        const products = shouldSearchProducts
            ? await queryMatchingProducts({ sizeInfo, priceFilter, keywords, askSuggest })
            : [];

        const fallbackReply = buildRuleBasedReply({
            message,
            sizeInfo,
            products,
            orderInfo,
            vouchers,
            faqs,
            askOrder,
            askPolicy
        });

        const contextLines = [];
        if (sizeInfo) contextLines.push(`- Tư vấn size: ${sizeInfo.reason}`);
        if (orderInfo) {
            contextLines.push(
                orderInfo.notFound
                    ? `- Tra cứu đơn ${orderInfo.maDon}: Không tìm thấy.`
                    : `- Đơn hàng #${orderInfo.maDon}: Trạng thái "${orderInfo.trangThaiText}", Tổng tiền ${formatVnd(orderInfo.tongTien)}, Thanh toán ${orderInfo.phuongThuc}.`
            );
        }
        if (products.length > 0) {
            contextLines.push(
                '- Sản phẩm tìm thấy trong kho:\n' +
                    products
                        .map(
                            (p) =>
                                `  * ${p.TenSanPham} (${p.TenDanhMuc || 'Thời trang'}) - Giá: ${formatVnd(p.Gia)} - Size còn hàng: ${p.SizesConHang || 'Đang cập nhật'}`
                        )
                        .join('\n')
            );
        }
        if (vouchers.length > 0) {
            contextLines.push(
                '- Mã giảm giá đang hoạt động:\n' +
                    vouchers
                        .map(
                            (v) =>
                                `  * Mã ${v.maCode}: ${v.moTa || ''} (Đơn tối thiểu ${formatVnd(v.donToiThieu)})`
                        )
                        .join('\n')
            );
        }
        if (faqs.length > 0) {
            contextLines.push(
                '- Chính sách cửa hàng:\n' + faqs.map((f) => `  * ${f.CauHoi}: ${f.TraLoi}`).join('\n')
            );
        }
        if (contextLines.length === 0) {
            contextLines.push('- Khách đang chào hỏi hoặc hỏi chung về cửa hàng ShopThoiTrang.');
        }

        const aiResult = await generateGeminiReply({
            message,
            history,
            contextSummary: contextLines.join('\n'),
            fallbackReply
        });

        return {
            reply: aiResult.text,
            source: aiResult.source,
            recommendedSize: sizeInfo,
            products,
            vouchers,
            orderInfo: orderInfo && !orderInfo.notFound ? orderInfo : null
        };
    }
};

module.exports = chatService;