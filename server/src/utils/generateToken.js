const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.NguoiDungId,
            email: user.Email,
            vaiTro: user.VaiTro
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = generateToken;