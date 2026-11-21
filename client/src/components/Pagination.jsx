const Pagination = ({ page, totalPages, onPageChange }) => {
    if (!totalPages || totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '28px', flexWrap: 'wrap' }}>
            <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
            >
                &laquo; Trước
            </button>

            {pages.map((p) => (
                <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => onPageChange(p)}
                >
                    {p}
                </button>
            ))}

            <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                Sau &raquo;
            </button>
        </div>
    );
};

export default Pagination;