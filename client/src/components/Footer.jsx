import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="container">
                <div className="footer-grid">
                    <div>
                        <div className="footer-title" style={{ fontSize: '18px' }}>
                            SHOPTHOITRANG
                        </div>
                        <p style={{ color: '#9ca3af', maxWidth: '380px' }}>
                            Hệ thống thời trang nam nữ hiện đại. Cam kết chất liệu cao cấp, kiểm tra hàng trước khi thanh toán và hỗ trợ đổi size linh hoạt trong 7 ngày.
                        </p>
                    </div>

                    <div>
                        <div className="footer-title">Liên kết nhanh</div>
                        <ul className="footer-links">
                            <li><Link to="/">Trang chủ</Link></li>
                            <li><Link to="/products">Sản phẩm mới</Link></li>
                            <li><Link to="/tra-cuu-don">Tra cứu đơn hàng</Link></li>
                            <li><Link to="/cart">Giỏ hàng của bạn</Link></li>
                        </ul>
                    </div>

                    <div>
                        <div className="footer-title">Hỗ trợ khách hàng</div>
                        <ul className="footer-links">
                            <li>Hotline: 0389137130 (8:00 - 21:00)</li>
                            <li>Email: phanhuy150305@gmail.com</li>
                            <li>Địa chỉ: Biên Hòa, Đồng Nai</li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    &copy; {new Date().getFullYear()} ShopThoiTrang. Đồ án chuyên ngành Công nghệ Thông tin.
                </div>
            </div>
        </footer>
    );
};

export default Footer;