import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Tọa độ kho xuất phát: Kho trung tâm ShopThoiTrang (Biên Hòa, Đồng Nai)
const SHOP_ORIGIN = {
    lat: 10.9465,
    lng: 106.8235,
    name: 'Kho ShopThoiTrang — TP. Biên Hòa, Đồng Nai'
};

// Từ điển tọa độ các khu vực/tỉnh thành phổ biến tại Việt Nam
const VN_LOCATIONS = [
    { keys: ['trảng dài', 'trang dai'], lat: 10.9789, lng: 106.8551 },
    { keys: ['tân phong', 'tan phong'], lat: 10.9652, lng: 106.8424 },
    { keys: ['tam hiệp', 'tam hiep'], lat: 10.9412, lng: 106.8495 },
    { keys: ['hố nai', 'ho nai'], lat: 10.9615, lng: 106.8822 },
    { keys: ['long bình', 'long binh'], lat: 10.9284, lng: 106.8791 },
    { keys: ['biên hòa', 'bien hoa', 'đồng nai', 'dong nai'], lat: 10.9574, lng: 106.8427 },
    { keys: ['long thành', 'long thanh'], lat: 10.7875, lng: 106.9522 },
    { keys: ['nhơn trạch', 'nhon trach'], lat: 10.7224, lng: 106.8902 },
    { keys: ['trảng bom', 'trang bom'], lat: 10.9538, lng: 107.0052 },
    { keys: ['long khánh', 'long khanh'], lat: 10.9336, lng: 107.2414 },
    { keys: ['dĩ an', 'di an'], lat: 10.9068, lng: 106.7694 },
    { keys: ['thuận an', 'thuan an'], lat: 10.9168, lng: 106.7169 },
    { keys: ['thủ dầu một', 'thu dau mot', 'bình dương', 'binh duong'], lat: 10.9804, lng: 106.6519 },
    { keys: ['thủ đức', 'thu duc'], lat: 10.8494, lng: 106.7537 },
    { keys: ['quận 1', 'quan 1', 'q1', 'q.1'], lat: 10.7769, lng: 106.7009 },
    { keys: ['quận 3', 'quan 3', 'q3'], lat: 10.7843, lng: 106.6844 },
    { keys: ['quận 7', 'quan 7', 'q7'], lat: 10.734, lng: 106.7218 },
    { keys: ['bình thạnh', 'binh thanh'], lat: 10.8105, lng: 106.7091 },
    { keys: ['gò vấp', 'go vap'], lat: 10.8386, lng: 106.6652 },
    { keys: ['tân bình', 'tan binh'], lat: 10.8014, lng: 106.6525 },
    { keys: ['hồ chí minh', 'ho chi minh', 'tp.hcm', 'tphcm', 'sài gòn', 'sai gon'], lat: 10.7829, lng: 106.6958 },
    { keys: ['vũng tàu', 'vung tau', 'bà rịa', 'ba ria'], lat: 10.346, lng: 107.0843 },
    { keys: ['đà lạt', 'da lat', 'lâm đồng', 'lam dong'], lat: 11.9404, lng: 108.4583 },
    { keys: ['nha trang', 'khánh hòa', 'khanh hoa'], lat: 12.2388, lng: 109.1967 },
    { keys: ['đà nẵng', 'da nang'], lat: 16.0544, lng: 108.2022 },
    { keys: ['huế', 'hue'], lat: 16.4637, lng: 107.5909 },
    { keys: ['hải phòng', 'hai phong'], lat: 20.8449, lng: 106.6881 },
    { keys: ['hà nội', 'ha noi'], lat: 21.0285, lng: 105.8542 },
    { keys: ['cần thơ', 'can tho'], lat: 10.0452, lng: 105.7469 }
];

const geocodeCache = new Map();

function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findMatchedCity(address) {
    const lower = String(address || '').toLowerCase();
    return VN_LOCATIONS.find((loc) => loc.keys.some((k) => lower.includes(k))) || null;
}

function resolveFallbackCoords(address, seedId = 1) {
    const jitterLat = (((Number(seedId) * 17) % 10) - 5) * 0.0018;
    const jitterLng = (((Number(seedId) * 31) % 10) - 5) * 0.0018;

    const matched = findMatchedCity(address);
    if (matched) {
        return {
            lat: matched.lat + jitterLat,
            lng: matched.lng + jitterLng
        };
    }

    // Địa chỉ nội thành ngắn chưa ghi tỉnh/thành -> mặc định khu vực TP. Biên Hòa
    return {
        lat: 10.9645 + jitterLat,
        lng: 106.8485 + jitterLng
    };
}

async function resolveDestination(address, seedId) {
    const cleanAddr = String(address || '').trim();
    if (!cleanAddr) return resolveFallbackCoords('', seedId);

    const cacheKey = `${cleanAddr}_${seedId}`;
    if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

    const matchedCity = findMatchedCity(cleanAddr);
    const searchQuery = matchedCity ? cleanAddr : `${cleanAddr}, Biên Hòa, Đồng Nai`;

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(searchQuery)}`,
            { signal: AbortSignal.timeout(4500) }
        );
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list[0]?.lat && list[0]?.lon) {
                const coords = { lat: Number(list[0].lat), lng: Number(list[0].lon) };
                geocodeCache.set(cacheKey, coords);
                return coords;
            }
        }
    } catch {
        // Chuyển sang tọa độ dự phòng
    }

    const fallback = resolveFallbackCoords(cleanAddr, seedId);
    geocodeCache.set(cacheKey, fallback);
    return fallback;
}

async function fetchRoadRoute(origin, dest) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5500) });
        if (res.ok) {
            const data = await res.json();
            const route = data?.routes?.[0];
            if (route?.geometry?.coordinates?.length > 1) {
                const latLngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                const distanceKm = Math.max(0.5, Number((route.distance / 1000).toFixed(1)));
                return { latLngs, distanceKm };
            }
        }
    } catch {
        // Fallback tuyến đường
    }

    const steps = 28;
    const latLngs = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curve = Math.sin(t * Math.PI) * 0.004;
        latLngs.push([
            origin.lat + (dest.lat - origin.lat) * t + curve,
            origin.lng + (dest.lng - origin.lng) * t - curve * 0.7
        ]);
    }
    const distanceKm = Math.max(1.2, Number((haversineKm(origin.lat, origin.lng, dest.lat, dest.lng) * 1.25).toFixed(1)));
    return { latLngs, distanceKm };
}

function getPointAtProgress(latLngs, progressPercent) {
    if (!latLngs || latLngs.length === 0) return [SHOP_ORIGIN.lat, SHOP_ORIGIN.lng];
    if (progressPercent <= 0) return latLngs[0];
    if (progressPercent >= 100) return latLngs[latLngs.length - 1];

    const exactIdx = (progressPercent / 100) * (latLngs.length - 1);
    const idx = Math.floor(exactIdx);
    const frac = exactIdx - idx;

    const p1 = latLngs[idx];
    const p2 = latLngs[Math.min(latLngs.length - 1, idx + 1)];
    return [p1[0] + (p2[0] - p1[0]) * frac, p1[1] + (p2[1] - p1[1]) * frac];
}

const createMarkerIcon = (bg, emoji, label, pulse = false) =>
    L.divIcon({
        className: 'custom-shop-map-pin',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        html: `
            <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
                ${
                    pulse
                        ? `<span style="position:absolute;inset:-6px;border-radius:50%;background:${bg};opacity:0.28;"></span>`
                        : ''
                }
                <div title="${label}" style="
                    width:34px;height:34px;border-radius:50%;background:${bg};color:#fff;
                    border:2.5px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.3);
                    display:flex;align-items:center;justify-content:center;font-size:16px;
                ">${emoji}</div>
            </div>
        `
    });

const OrderTrackingMap = ({ order }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const [routeData, setRouteData] = useState(null);
    const [loadingMap, setLoadingMap] = useState(true);

    const progress = useMemo(() => {
        if (!order) return 0;
        if (['HOAN_THANH', 'YEU_CAU_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(order.TrangThai)) {
            return 100;
        }
        if (order.TrangThai === 'DANG_GIAO') {
            if (order.NgayBanGiao) {
                const hours = Math.max(0, (Date.now() - new Date(order.NgayBanGiao).getTime()) / 3600000);
                return Math.min(92, Math.max(48, Math.round(48 + hours * 2)));
            }
            return 60;
        }
        return 0;
    }, [order]);

    useEffect(() => {
        if (!order || order.TrangThai === 'DA_HUY') return;
        let cancelled = false;
        setLoadingMap(true);

        (async () => {
            const dest = await resolveDestination(order.DiaChiNhan, order.DonHangId);
            const road = await fetchRoadRoute(SHOP_ORIGIN, dest);
            if (!cancelled) {
                setRouteData({ dest, ...road });
                setLoadingMap(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [order?.DonHangId, order?.DiaChiNhan, order?.TrangThai]);

    useEffect(() => {
        if (!routeData || !mapContainerRef.current) return;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            scrollWheelZoom: false
        });
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 18
        }).addTo(map);

        L.polyline(routeData.latLngs, {
            color: '#ffffff',
            weight: 9,
            opacity: 0.9
        }).addTo(map);

        const fullLine = L.polyline(routeData.latLngs, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.75,
            dashArray: '10, 8'
        }).addTo(map);

        const shipperPoint = getPointAtProgress(routeData.latLngs, progress);
        if (progress > 0) {
            const sliceCount = Math.max(1, Math.round((progress / 100) * routeData.latLngs.length));
            const passedCoords = routeData.latLngs.slice(0, sliceCount);
            passedCoords.push(shipperPoint);

            L.polyline(passedCoords, {
                color: '#f97316',
                weight: 6,
                opacity: 1
            }).addTo(map);
        }

        L.marker([SHOP_ORIGIN.lat, SHOP_ORIGIN.lng], {
            icon: createMarkerIcon('#0f172a', '🏪', SHOP_ORIGIN.name)
        })
            .addTo(map)
            .bindPopup(`<strong>Kho gửi hàng:</strong><br/>${SHOP_ORIGIN.name}`);

        L.marker([routeData.dest.lat, routeData.dest.lng], {
            icon: createMarkerIcon('#e11d48', '📍', order.DiaChiNhan)
        })
            .addTo(map)
            .bindPopup(`<strong>Người nhận: ${order.HoTenNhan}</strong><br/>${order.DiaChiNhan}`);

        if (progress > 0 && progress < 100) {
            L.marker(shipperPoint, {
                icon: createMarkerIcon('#f97316', '🚚', 'Vị trí kiện hàng hiện tại', true),
                zIndexOffset: 1000
            })
                .addTo(map)
                .bindPopup(
                    `<strong>${order.DonViVanChuyen || 'SPX Express'}</strong><br/>Mã vận đơn: ${order.MaVanDon || order.MaDon}<br/>Đã hoàn thành ${progress}% lộ trình`
                );
        }

        map.fitBounds(fullLine.getBounds(), { padding: [40, 40] });
        setTimeout(() => map.invalidateSize(), 150);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [routeData, progress, order]);

    if (!order || order.TrangThai === 'DA_HUY') return null;

    const totalKm = routeData?.distanceKm || 0;
    const remainingKm = Math.max(0, Number(((totalKm * (100 - progress)) / 100).toFixed(1)));
    const etaMinutes = Math.max(5, Math.round(remainingKm * 2.2 + 10));

    const stageLabel =
        progress >= 100
            ? 'Đã giao hàng thành công tới địa chỉ người nhận'
            : progress === 0
            ? 'Kiện hàng đang ở Kho ShopThoiTrang (Biên Hòa) chờ bàn giao ĐVVC'
            : remainingKm <= 2
            ? 'Shipper đang ở rất gần địa chỉ của bạn!'
            : `Shipper đang giao hàng trên tuyến đường (${progress}% hành trình)`;

    return (
        <div
            style={{
                position: 'relative',
                zIndex: 1,
                isolation: 'isolate',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '18px'
            }}
        >
            {/* Thanh trạng thái tuyến đường phía trên bản đồ */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    padding: '12px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >
                <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🗺️ Lộ trình vận chuyển đơn hàng</span>
                        {order.DonViVanChuyen && (
                            <span
                                style={{
                                    background: '#f97316',
                                    padding: '2px 9px',
                                    borderRadius: '999px',
                                    fontSize: '11.5px',
                                    fontWeight: 700
                                }}
                            >
                                {order.DonViVanChuyen}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#cbd5e1', marginTop: '3px' }}>{stageLabel}</div>
                </div>

                {routeData && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', textAlign: 'right' }}>
                        <div>
                            <div style={{ color: '#94a3b8', fontSize: '11px' }}>Quãng đường còn lại</div>
                            <strong style={{ color: '#38bdf8', fontSize: '14px' }}>
                                {progress >= 100 ? '0 km (Đã tới nơi)' : `${remainingKm} / ${totalKm} km`}
                            </strong>
                        </div>
                        {progress < 100 && (
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>Dự kiến giao</div>
                                <strong style={{ color: '#4ade80', fontSize: '14px' }}>
                                    {etaMinutes < 60 ? `~${etaMinutes} phút` : `~${Math.ceil(etaMinutes / 60)} giờ`}
                                </strong>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Khung bản đồ */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '300px',
                    background: '#e2e8f0',
                    overflow: 'hidden'
                }}
            >
                {loadingMap && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 500,
                            background: 'rgba(248,250,252,0.88)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13.5px',
                            color: '#475569',
                            fontWeight: 600
                        }}
                    >
                        Đang tải lộ trình giao hàng...
                    </div>
                )}
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Chú thích điểm mốc */}
            <div
                style={{
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    color: '#475569'
                }}
            >
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span>🏪 Kho ShopThoiTrang (Biên Hòa)</span>
                    {progress > 0 && progress < 100 && <span>🚚 Vị trí kiện hàng hiện tại</span>}
                    <span>📍 Địa chỉ người nhận</span>
                </div>

                {order.MaVanDon && (
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        Mã vận đơn: <span style={{ color: '#0284c7' }}>{order.MaVanDon}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderTrackingMap;