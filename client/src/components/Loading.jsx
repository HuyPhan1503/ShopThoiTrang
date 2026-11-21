const Loading = ({ text = 'Đang tải dữ liệu...' }) => {
    return (
        <div className="spinner-wrap">
            <div className="spinner" />
            <span>{text}</span>
        </div>
    );
};

export default Loading;