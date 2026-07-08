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

-- 4. Tạo bảng Người Dùng (Liên kết với Supabase Auth)
-- [FIX #3] idnguoidung dùng BIGSERIAL (tự tăng), thêm auth_uid UUID tham chiếu auth.users
CREATE TABLE nguoidung (
    idnguoidung BIGSERIAL PRIMARY KEY,
    auth_uid    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    hoten       VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    anhdaidien  TEXT,
    ngaysinh    DATE,
    sodienthoai VARCHAR(20),
    github      VARCHAR(100),
    figma       VARCHAR(100),
    linkpdf     TEXT,
    thoigian    TIMESTAMPTZ DEFAULT NOW()
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
-- [FIX #3] idnguoidung FK đổi từ INT sang BIGINT để khớp với BIGSERIAL
CREATE TABLE nhatkyhoatdong (
    idnhatky    BIGSERIAL PRIMARY KEY,
    idden       INT REFERENCES den(idden) ON DELETE SET NULL,
    idcambien   BIGINT REFERENCES dulieucambien(iddl) ON DELETE SET NULL,
    idnguoidung BIGINT REFERENCES nguoidung(idnguoidung) ON DELETE SET NULL,
    hanhdong    TEXT NOT NULL,
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tạo bảng Lịch Hẹn Giờ (Lưu cấu hình hẹn giờ bật/tắt thiết bị)
CREATE TABLE lichhengio (
    idid         BIGSERIAL PRIMARY KEY,
    idden        INT REFERENCES den(idden) ON DELETE CASCADE,
    hanhdong     VARCHAR(10) NOT NULL, -- 'on' hoặc 'off'
    thoigian     TIME NOT NULL,        -- Định dạng 'HH:MM:SS' hoặc 'HH:MM'
    thu          INT[] NOT NULL,       -- Mảng chứa các thứ: 0 (Chủ nhật), 1 (Thứ 2), ..., 6 (Thứ 7)
    kichhoat     BOOLEAN DEFAULT TRUE,
    thoigian_tao TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. Khởi tạo dữ liệu mặc định (Seed Data)
-- ============================================================

-- Khởi tạo 3 thiết bị
INSERT INTO den (idden, tenden, trangthai) VALUES
(1, 'Điều hòa', 0),
(2, 'Quạt', 0),
(3, 'Đèn', 0)
ON CONFLICT (idden) DO NOTHING;

-- [FIX #1] Ngưỡng mặc định đồng bộ với frontend: temp=30, humid=75, light=200
-- Vận hành: điều hòa bật khi nhiệt độ > 30°C, quạt bật khi độ ẩm > 75%,
--           đèn bật khi ánh sáng < 200 lx
INSERT INTO luat (idluat, idden, loaicambien, toantu, nguong, automation) VALUES
(1, 1, 'NhietDo', '>',  30.0, true),
(2, 2, 'DoAm',    '>',  75.0, true),
(3, 3, 'AnhSang', '<', 200.0, true)
ON CONFLICT (idluat) DO NOTHING;

-- Khởi tạo dữ liệu mặc định cho Lịch hẹn giờ
INSERT INTO lichhengio (idid, idden, hanhdong, thoigian, thu, kichhoat) VALUES
(1, 3, 'on',  '18:30:00', ARRAY[1, 2, 3, 4, 5], true),
(2, 1, 'off', '07:00:00', ARRAY[0, 1, 2, 3, 4, 5, 6], true),
(3, 2, 'on',  '13:00:00', ARRAY[0, 6], false)
ON CONFLICT (idid) DO NOTHING;

-- Ghi chú: Dữ liệu nguoidung được tạo tự động khi người dùng đăng ký
-- qua Supabase Auth (xem trigger handle_new_user bên dưới).
-- KHÔNG nên insert thủ công idnguoidung vì sẽ gây xung đột với auth_uid.

-- ============================================================
-- 9. Trigger tự động tạo profile khi người dùng đăng ký Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.nguoidung (auth_uid, hoten, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (auth_uid) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 10. Tắt Row Level Security (phù hợp cho môi trường IoT nội bộ)
-- ============================================================
ALTER TABLE dulieucambien  DISABLE ROW LEVEL SECURITY;
ALTER TABLE den            DISABLE ROW LEVEL SECURITY;
ALTER TABLE luat           DISABLE ROW LEVEL SECURITY;
ALTER TABLE nhatkyhoatdong DISABLE ROW LEVEL SECURITY;
ALTER TABLE nguoidung      DISABLE ROW LEVEL SECURITY;
ALTER TABLE lichhengio     DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. [FIX #2] Bật Realtime cho các bảng cần thiết (Bọc trong khối DO để tránh lỗi nếu đã tồn tại)
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE den;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table den is already a member of publication';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE luat;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table luat is already a member of publication';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nhatkyhoatdong;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table nhatkyhoatdong is already a member of publication';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dulieucambien;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table dulieucambien is already a member of publication';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE lichhengio;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table lichhengio is already a member of publication';
  END;
END $$;
