const { pool } = require('../config/database');

const faqModel = {
    async findAll({ chuDe, keyword }) {
        const conditions = [];
        const params = [];

        if (chuDe && chuDe !== 'ALL') {
            conditions.push('ChuDe = ?');
            params.push(chuDe);
        }

        if (keyword) {
            conditions.push('(CauHoi LIKE ? OR TraLoi LIKE ?)');
            const like = `%${keyword}%`;
            params.push(like, like);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT CauHoiId, ChuDe, CauHoi, TraLoi
             FROM CAU_HOI_THUONG_GAP
             ${whereClause}
             ORDER BY CauHoiId ASC`,
            params
        );
        return rows;
    },

    async findById(id) {
        const [rows] = await pool.query(
            'SELECT CauHoiId, ChuDe, CauHoi, TraLoi FROM CAU_HOI_THUONG_GAP WHERE CauHoiId = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    async create({ chuDe, cauHoi, traLoi }) {
        const [result] = await pool.query(
            'INSERT INTO CAU_HOI_THUONG_GAP (ChuDe, CauHoi, TraLoi) VALUES (?, ?, ?)',
            [chuDe, cauHoi, traLoi]
        );
        return result.insertId;
    },

    async update(id, { chuDe, cauHoi, traLoi }) {
        const [result] = await pool.query(
            'UPDATE CAU_HOI_THUONG_GAP SET ChuDe = ?, CauHoi = ?, TraLoi = ? WHERE CauHoiId = ?',
            [chuDe, cauHoi, traLoi, id]
        );
        return result.affectedRows > 0;
    },

    async delete(id) {
        const [result] = await pool.query(
            'DELETE FROM CAU_HOI_THUONG_GAP WHERE CauHoiId = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
};

module.exports = faqModel;