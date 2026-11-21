const buildVietQrInfo = (order) => {
    const bankId = process.env.VIETQR_BANK_ID || 'ICB';
    const bankName = process.env.VIETQR_BANK_NAME || 'VietinBank - CN KCN Biên Hòa';
    const accountNo = process.env.VIETQR_ACCOUNT_NO || '103882422327';
    const accountName = process.env.VIETQR_ACCOUNT_NAME || 'PHAN NGUYEN GIA HUY';
    const template = process.env.VIETQR_TEMPLATE || 'compact2';

    const amount = Math.max(0, Math.round(Number(order.TongTien) || 0));
    const addInfo = `${order.MaDon}`;

    const qrUrl =
        `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-${encodeURIComponent(template)}.png` +
        `?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

    return {
        bankId,
        bankName,
        accountNo,
        accountName,
        amount,
        addInfo,
        qrUrl
    };
};

module.exports = { buildVietQrInfo };