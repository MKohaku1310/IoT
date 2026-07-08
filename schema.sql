-- 1. Xóa các bảng cũ nếu đã tồn tại (để tránh xung đột)
DROP TABLE IF EXISTS lichhengio;
DROP TABLE IF EXISTS nhatkyhoatdong;
DROP TABLE IF EXISTS luat;
DROP TABLE IF EXISTS den;
DROP TABLE IF EXISTS dulieucambien;
DROP TABLE IF EXISTS nguoidung;

-- 2. Tạo bảng Dữ Liệu Cảm Biến (Lưu trữ lịch sử đo đạc từ ESP32)
CREATE TABLE dulieucambien (
    iddl BIGSERIAL PRIMARY KEY,
    thoigian TIMESTAMPTZ DEFAULT NOW(),
    nhietdo NUMERIC(5, 2),
    doam NUMERIC(5, 2),
    anhsang NUMERIC(6, 2),
    cambien VARCHAR(50) DEFAULT 'ESP32'
);

-- 3. Tạo bảng Đèn (Lưu trữ thông tin và trạng thái thực tế của các thiết bị)
CREATE TABLE den (
    idden INT PRIMARY KEY,
    tenden VARCHAR(100) NOT NULL,
    trangthai INT DEFAULT 0, -- 0: Tắt (OFF), 1: Bật (ON)
    thoigian TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo bảng Người Dùng (Lưu trữ thông tin hồ sơ cá nhân)
CREATE TABLE nguoidung (
    idnguoidung INT PRIMARY KEY,
    hoten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    anhdaidien TEXT,
    ngaysinh DATE,
    sodienthoai VARCHAR(20),
    github VARCHAR(100),
    figma VARCHAR(100),
    linkpdf TEXT,
    thoigian TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tạo bảng Luật Tự Động Hóa (Cấu hình các quy tắc điều khiển tự động)
CREATE TABLE luat (
    idluat INT PRIMARY KEY,
    idden INT REFERENCES den(idden) ON DELETE CASCADE,
    loaicambien VARCHAR(50) NOT NULL, -- 'NhietDo', 'DoAm', 'AnhSang'
    toantu VARCHAR(10) NOT NULL,      -- '>', '<', '='
    nguong NUMERIC(6, 2) NOT NULL,
    automation BOOLEAN DEFAULT TRUE   -- true: Chế độ Tự động, false: Chế độ Thủ công
);

-- 6. Tạo bảng Nhật Ký Hoạt Động (Ghi lại các sự kiện điều khiển và cảnh báo)
CREATE TABLE nhatkyhoatdong (
    idnhatky BIGSERIAL PRIMARY KEY,
    idden INT REFERENCES den(idden) ON DELETE SET NULL,
    idcambien BIGINT REFERENCES dulieucambien(iddl) ON DELETE SET NULL,
    idnguoidung INT REFERENCES nguoidung(idnguoidung) ON DELETE SET NULL,
    hanhdong TEXT NOT NULL,
    thoigian TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Khởi tạo dữ liệu mặc định (Seed Data)
-- Khởi tạo người dùng mặc định
INSERT INTO nguoidung (idnguoidung, hoten, email, anhdaidien, ngaysinh, sodienthoai, github, figma, linkpdf) VALUES
(1, 'Đặng Trần Hải Đăng', 'bundeeptry115@gmail.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', '2004-05-11', '033 429 6045', 'HaiDangDeptrai', 'Đặng Trần Hải Đăng', '')
ON CONFLICT (idnguoidung) DO NOTHING;

-- Khởi tạo 3 thiết bị LED
INSERT INTO den (idden, tenden, trangthai) VALUES
(1, 'Điều hòa', 0),
(2, 'Quạt', 0),
(3, 'Đèn', 0)
ON CONFLICT (idden) DO NOTHING;

INSERT INTO luat (idluat, idden, loaicambien, toantu, nguong, automation) VALUES
(1, 1, 'NhietDo', '>', 35.0, true),
(2, 2, 'DoAm', '>', 80.0, true),
(3, 3, 'AnhSang', '<', 100.0, true)
ON CONFLICT (idluat) DO NOTHING;

-- 8. Tạo bảng Lịch Hẹn Giờ (Lưu cấu hình hẹn giờ bật/tắt thiết bị)
CREATE TABLE lichhengio (
    idid BIGSERIAL PRIMARY KEY,
    idden INT REFERENCES den(idden) ON DELETE CASCADE,
    hanhdong VARCHAR(10) NOT NULL, -- 'on' hoặc 'off'
    thoigian TIME NOT NULL,        -- Định dạng 'HH:MM:SS' hoặc 'HH:MM'
    thu INT[] NOT NULL,            -- Mảng chứa các thứ: 0 (Chủ nhật), 1 (Thứ 2), ..., 6 (Thứ 7)
    kichhoat BOOLEAN DEFAULT TRUE,
    thoigian_tao TIMESTAMPTZ DEFAULT NOW()
);

-- Khởi tạo dữ liệu mặc định cho Lịch hẹn giờ
INSERT INTO lichhengio (idid, idden, hanhdong, thoigian, thu, kichhoat) VALUES
(1, 3, 'on', '18:30:00', ARRAY[1, 2, 3, 4, 5], true),
(2, 1, 'off', '07:00:00', ARRAY[0, 1, 2, 3, 4, 5, 6], true),
(3, 2, 'on', '13:00:00', ARRAY[0, 6], false)
ON CONFLICT (idid) DO NOTHING;

ALTER TABLE dulieucambien DISABLE ROW LEVEL SECURITY;
ALTER TABLE den DISABLE ROW LEVEL SECURITY;
ALTER TABLE luat DISABLE ROW LEVEL SECURITY;
ALTER TABLE nhatkyhoatdong DISABLE ROW LEVEL SECURITY;
ALTER TABLE nguoidung DISABLE ROW LEVEL SECURITY;
ALTER TABLE lichhengio DISABLE ROW LEVEL SECURITY;

-- 9. Cấu hình Supabase Realtime (Chạy trong SQL Editor của Supabase)
-- Bật Realtime cho các bảng để frontend và backend nhận thông tin tức thời
-- ALTER PUBLICATION supabase_realtime ADD TABLE den;
-- ALTER PUBLICATION supabase_realtime ADD TABLE luat;
-- ALTER PUBLICATION supabase_realtime ADD TABLE nhatkyhoatdong;
-- ALTER PUBLICATION supabase_realtime ADD TABLE dulieucambien;
-- ALTER PUBLICATION supabase_realtime ADD TABLE lichhengio;
