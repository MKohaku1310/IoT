-- ============================================================
-- 05_SEED_DATA.SQL — Dữ Liệu Khởi Tạo Mẫu
-- Dữ liệu thiết lập ban đầu cho Nodes, Thiết bị, Luật & Gói cước
-- ============================================================

-- Node Cấu hình Hệ thống
INSERT INTO public.esp32_nodes (idnode, ten_phong, trang_thai, rssi, cpu_temp, flash_used, ota_status) VALUES
('SYSTEM_CONFIG', 'System Configuration', 'online', -80, 65, 60, 'idle')
ON CONFLICT (idnode) DO NOTHING;

-- Các Node ESP32 Khởi tạo
INSERT INTO public.esp32_nodes (idnode, ten_phong, firmware_version, trang_thai, last_heartbeat, uptime_percent, rssi, flash_used, cpu_temp, loai_phong, mo_ta, trang_thai_duyet) VALUES
('ESP32-S3-Node-01', 'Phòng khách', '1.0.0', 'offline', NOW()-INTERVAL '5 minutes',  99.42, -62, 45.20, 38.5, 'phong_khach', 'Phòng khách chính tầng 1', 'approved'),
('ESP32-S3-Node-02', 'Phòng ngủ',   '1.0.0', 'offline', NOW()-INTERVAL '10 minutes', 98.90, -68, 48.10, 41.2, 'phong_ngu',   'Phòng ngủ chính tầng 2',  'approved'),
('ESP32-C3-Kitchen', 'Nhà bếp',     '0.9.8', 'offline', NOW()-INTERVAL '12 hours',   92.15, -75, 52.40, 45.0, 'nha_bep',     'Nhà bếp tầng 1',           'approved')
ON CONFLICT (idnode) DO NOTHING;

-- Household Mặc định
INSERT INTO public.hogiadinh (id_hogiadinh, ten_nha, dia_chi) VALUES
(1, 'Nhà Mặc Định', 'Hà Nội, Việt Nam') ON CONFLICT (id_hogiadinh) DO NOTHING;

UPDATE public.esp32_nodes SET id_hogiadinh = 1
WHERE idnode IN ('ESP32-S3-Node-01','ESP32-S3-Node-02','ESP32-C3-Kitchen');

-- Thiết bị mẫu
INSERT INTO public.thietbi (id_thietbi, idnode, loai_thietbi, ten_hienthi, dia_chi_hw, trangthai, tu_dong, cau_hinh) VALUES
(1, 'ESP32-S3-Node-01', 'dieu_hoa', 'Điều hòa phòng khách', 'IR-TX-5', 0, true, '{}'),
(2, 'ESP32-S3-Node-01', 'quat',     'Quạt phòng khách',     'GPIO-4',  0, true, '{}'),
(3, 'ESP32-S3-Node-01', 'den',      'Đèn phòng khách',      'GPIO-2',  0, true, '{}'),
(4, 'ESP32-S3-Node-02', 'den',      'Đèn phòng ngủ',      'GPIO-2',  0, true, '{}'),
(5, 'ESP32-S3-Node-02', 'quat',     'Quạt phòng ngủ',     'GPIO-4',  0, true, '{}'),
(6, 'ESP32-S3-Node-02', 'dieu_hoa', 'Điều hòa phòng ngủ', 'IR-TX-5', 0, true, '{}'),
(7, 'ESP32-C3-Kitchen', 'den',          'Đèn nhà bếp',       'GPIO-2', 0, true,  '{}'),
(8, 'ESP32-C3-Kitchen', 'cam_bien_gas', 'Cảm biến Gas MQ-2', 'ADC-34', 0, false, '{"threshold":300,"unit":"ppm","gas_type":"LPG/Methane","warn_level":200,"danger_level":300}')
ON CONFLICT (id_thietbi) DO NOTHING;

SELECT setval('public.thietbi_id_thietbi_seq', (SELECT MAX(id_thietbi) FROM public.thietbi));

-- Automation Rules Mặc định
INSERT INTO public.luat (idluat, id_thietbi, loaicambien, toantu, nguong, automation) VALUES
(1, 1, 'NhietDo', '>', 30.0, true),
(2, 2, 'DoAm',    '>', 75.0, true),
(3, 3, 'AnhSang', '<', 200.0, true)
ON CONFLICT (idluat) DO NOTHING;

SELECT setval('public.luat_idluat_seq', (SELECT MAX(idluat) FROM public.luat));

-- Lịch hẹn giờ Mặc định
INSERT INTO public.lichhengio (idid, id_thietbi, hanhdong, thoigian, thu, kichhoat) VALUES
(1, 3, 'on',  '18:30:00', ARRAY[1,2,3,4,5], true),
(2, 1, 'off', '07:00:00', ARRAY[0,1,2,3,4,5,6], true),
(3, 2, 'on',  '13:00:00', ARRAY[0,6], false)
ON CONFLICT (idid) DO NOTHING;

SELECT setval('public.lichhengio_idid_seq', (SELECT MAX(idid) FROM public.lichhengio));

-- Gói dịch vụ
INSERT INTO public.goi_dich_vu (ten_goi, gia_tien, chu_ky_thang, mo_ta) VALUES
('Free Tier',            0.00,  1, 'Giám sát cơ bản, lịch sử 24h, tối đa 1 nhà.'),
('AI Smart Standard', 49000.00, 1, 'AI phân tích xu hướng, cảnh báo Telegram, lịch sử 30 ngày.'),
('Premium AI Smart Pro', 99000.00, 1, 'AI Assistant, phát hiện gas rò rỉ, camera RTSP, bảo hành vàng.')
ON CONFLICT (ten_goi) DO UPDATE SET gia_tien=EXCLUDED.gia_tien, mo_ta=EXCLUDED.mo_ta;
