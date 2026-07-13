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
    vaitro      VARCHAR(20) DEFAULT 'buyer',
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
ALTER TABLE lichhengio     DISABLE ROW LEVEL SECURITY;

-- 10.1 Cấu hình bảo mật và RLS cho bảng Người Dùng (nguoidung)
ALTER TABLE nguoidung      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for everyone" ON nguoidung
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for everyone" ON nguoidung
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for owners" ON nguoidung
    FOR UPDATE USING (auth.uid() = auth_uid);

CREATE POLICY "Allow delete for owners" ON nguoidung
    FOR DELETE USING (auth.uid() = auth_uid);

-- ============================================================
-- 11. [FIX #2] Bật Realtime cho các bảng cần thiết
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE den;
ALTER PUBLICATION supabase_realtime ADD TABLE luat;
ALTER PUBLICATION supabase_realtime ADD TABLE nhatkyhoatdong;
ALTER PUBLICATION supabase_realtime ADD TABLE dulieucambien;
ALTER PUBLICATION supabase_realtime ADD TABLE lichhengio;

-- ============================================================
-- 12. [FIX #4] Indexes cho các cột query thường xuyên
-- Giúp tăng tốc ORDER BY thoigian DESC và WHERE filters
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_dulieucambien_thoigian ON dulieucambien(thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_thoigian ON nhatkyhoatdong(thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_idden ON nhatkyhoatdong(idden);
CREATE INDEX IF NOT EXISTS idx_lichhengio_kichhoat ON lichhengio(kichhoat) WHERE kichhoat = true;

-- ============================================================
-- 13. [FIX #5] Hàm dọn dẹp dữ liệu cũ (Data Retention)
-- Xóa dữ liệu cảm biến > 30 ngày và nhật ký > 90 ngày
-- Chạy thủ công: SELECT cleanup_old_data();
-- Hoặc đặt pg_cron trên Supabase Dashboard (Extensions → pg_cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sensor_count INT;
  log_count INT;
BEGIN
  DELETE FROM dulieucambien WHERE thoigian < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS sensor_count = ROW_COUNT;

  DELETE FROM nhatkyhoatdong WHERE thoigian < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS log_count = ROW_COUNT;

  RETURN format('Đã xóa %s bản ghi cảm biến và %s bản ghi nhật ký', sensor_count, log_count);
END;
$$;

-- ============================================================
-- 14. Hàm lấy dữ liệu xu hướng cảm biến gom nhóm mỗi 2 phút
-- Trả về khoảng 720 dòng trong vòng 24h qua.
-- Hỗ trợ giữ lại các mốc không có dữ liệu dưới dạng NULL để vẽ nét đứt (gap).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sensor_trend_2min()
RETURNS TABLE (
    time_bucket TIMESTAMPTZ,
    avg_temp NUMERIC,
    avg_humidity NUMERIC,
    avg_light NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH time_series AS (
        SELECT generate_series(
            to_timestamp(floor(extract(epoch FROM NOW() - INTERVAL '24 hours') / 120) * 120),
            to_timestamp(floor(extract(epoch FROM NOW()) / 120) * 120),
            INTERVAL '2 minutes'
        ) AS bucket
    ),
    aggregated_data AS (
        SELECT
            to_timestamp(floor(extract(epoch FROM thoigian) / 120) * 120) AS tb,
            AVG(nhietdo) AS t,
            AVG(doam) AS h,
            AVG(anhsang) AS l
        FROM public.dulieucambien
        WHERE thoigian >= NOW() - INTERVAL '24 hours'
        GROUP BY tb
    )
    SELECT
        ts.bucket AS time_bucket,
        ROUND(ad.t, 2) AS avg_temp,
        ROUND(ad.h, 2) AS avg_humidity,
        ROUND(ad.l, 2) AS avg_light
    FROM time_series ts
    LEFT JOIN aggregated_data ad ON ts.bucket = ad.tb
    ORDER BY ts.bucket ASC;
END;
$$;

-- ============================================================
-- 15. Hàm lấy dữ liệu xu hướng cảm biến theo khoảng thời gian
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sensor_trend(range_type TEXT)
RETURNS TABLE (
    label TEXT,
    temp NUMERIC,
    humid NUMERIC,
    light NUMERIC,
    temp_prev_avg NUMERIC,
    humid_prev_avg NUMERIC,
    light_prev_avg NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF range_type = 'today' THEN
        RETURN QUERY
        WITH hour_series AS (
            SELECT generate_series(
                DATE_TRUNC('hour', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '23 hours',
                DATE_TRUNC('hour', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                INTERVAL '1 hour'
            ) AS hr
        ),
        hourly_data AS (
            SELECT
                DATE_TRUNC('hour', thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh') AS hr,
                AVG(nhietdo) AS t,
                AVG(doam) AS h,
                AVG(anhsang) AS l
            FROM public.dulieucambien
            WHERE thoigian >= (DATE_TRUNC('hour', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '23 hours'
            GROUP BY hr
        )
        SELECT
            TO_CHAR(hs.hr, 'HH24:MI')::TEXT AS label,
            ROUND(hd.t, 1)::NUMERIC AS temp,
            ROUND(hd.h, 1)::NUMERIC AS humid,
            ROUND(hd.l, 1)::NUMERIC AS light,
            NULL::NUMERIC AS temp_prev_avg,
            NULL::NUMERIC AS humid_prev_avg,
            NULL::NUMERIC AS light_prev_avg
        FROM hour_series hs
        LEFT JOIN hourly_data hd ON hs.hr = hd.hr
        ORDER BY hs.hr ASC;

    ELSIF range_type = '7d' THEN
        RETURN QUERY
        WITH day_series AS (
            SELECT generate_series(
                DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '6 days',
                DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                INTERVAL '1 day'
            ) AS dy
        ),
        daily_data AS (
            SELECT
                DATE_TRUNC('day', thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh') AS dy,
                AVG(nhietdo) AS t,
                AVG(doam) AS h,
                AVG(anhsang) AS l
            FROM public.dulieucambien
            WHERE thoigian >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '6 days'
            GROUP BY dy
        )
        SELECT
            TO_CHAR(ds.dy, 'DD/MM')::TEXT AS label,
            ROUND(dd.t, 1)::NUMERIC AS temp,
            ROUND(dd.h, 1)::NUMERIC AS humid,
            ROUND(dd.l, 1)::NUMERIC AS light,
            NULL::NUMERIC AS temp_prev_avg,
            NULL::NUMERIC AS humid_prev_avg,
            NULL::NUMERIC AS light_prev_avg
        FROM day_series ds
        LEFT JOIN daily_data dd ON ds.dy = dd.dy
        ORDER BY ds.dy ASC;

    ELSIF range_type = '30d' THEN
        RETURN QUERY
        WITH day_series AS (
            SELECT generate_series(
                DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '29 days',
                DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
                INTERVAL '1 day'
            ) AS dy
        ),
        daily_data AS (
            SELECT
                DATE_TRUNC('day', thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh') AS dy,
                AVG(nhietdo) AS t,
                AVG(doam) AS h,
                AVG(anhsang) AS l
            FROM public.dulieucambien
            WHERE thoigian >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '29 days'
            GROUP BY dy
        )
        SELECT
            TO_CHAR(ds.dy, 'DD/MM')::TEXT AS label,
            ROUND(dd.t, 1)::NUMERIC AS temp,
            ROUND(dd.h, 1)::NUMERIC AS humid,
            ROUND(dd.l, 1)::NUMERIC AS light,
            NULL::NUMERIC AS temp_prev_avg,
            NULL::NUMERIC AS humid_prev_avg,
            NULL::NUMERIC AS light_prev_avg
        FROM day_series ds
        LEFT JOIN daily_data dd ON ds.dy = dd.dy
        ORDER BY ds.dy ASC;
    END IF;
END;
$$;


-- ============================================================
-- 16. Hàm lấy dữ liệu trung bình 7 ngày qua theo thứ và giờ cho bản đồ nhiệt
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sensor_heatmap()
RETURNS TABLE (
    dow INT,
    hr INT,
    avg_temp NUMERIC,
    avg_humid NUMERIC,
    avg_light NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(ISODOW FROM thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT AS dow,
        EXTRACT(HOUR FROM thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT AS hr,
        ROUND(AVG(nhietdo), 1)::NUMERIC AS avg_temp,
        ROUND(AVG(doam), 1)::NUMERIC AS avg_humid,
        ROUND(AVG(anhsang), 1)::NUMERIC AS avg_light
    FROM public.dulieucambien
    WHERE thoigian >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '6 days'
    GROUP BY dow, hr
    ORDER BY dow, hr;
END;
$$;


-- ============================================================
-- 17. Bảng Kho Thiết Bị Xuất Xưởng (Hỗ trợ Device Claiming Flow)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thietbi_khoban (
    id_thietbi      BIGSERIAL PRIMARY KEY,
    mac_address     VARCHAR(20) UNIQUE NOT NULL,             -- Địa chỉ MAC vật lý của ESP32
    ma_kichhoat     VARCHAR(20) UNIQUE NOT NULL,             -- Mã kích hoạt in trên vỏ hộp
    loai_thietbi    VARCHAR(30),                             -- 'den', 'quat', 'dieuhoa'...
    trangthai       VARCHAR(20) DEFAULT 'chua_ban',          -- 'chua_ban', 'da_ban', 'thu_hoi'
    idnguoidung     BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL, -- Chủ sở hữu thiết bị
    nha_id          BIGINT,                                  -- Thuộc về ngôi nhà nào (tùy chọn)
    ngay_kichhoat   TIMESTAMPTZ,
    thoigian_taokho  TIMESTAMPTZ DEFAULT NOW()
);

-- Liên kết bảng den thực tế với kho thiết bị
ALTER TABLE public.den ADD COLUMN IF NOT EXISTS id_thietbi_khoban BIGINT REFERENCES public.thietbi_khoban(id_thietbi) ON DELETE CASCADE;


-- ============================================================
-- 18. Bảng Thông Báo Hệ Thống (Thảo luận & Thông báo 2 chiều)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thongbao_hethong (
    id_thongbao     BIGSERIAL PRIMARY KEY,
    tieude          VARCHAR(200) NOT NULL,
    noidung         TEXT NOT NULL,
    loai            VARCHAR(20) DEFAULT 'capnhat',           -- 'capnhat', 'baotri', 'canhbao', 'phanhoi'
    nguoi_gui       BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL, -- Admin nào gửi
    doi_tuong       VARCHAR(20) DEFAULT 'all',               -- 'all' hoặc 'ca_nhan'
    idnguoidung_nhan BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE, -- Nhận cá nhân
    da_doc          BOOLEAN DEFAULT FALSE,
    thoigian        TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 19. Bảng Yêu Cầu Hỗ Trợ Kỹ Thuật (Tickets)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.yeucau_hotro (
    id_yeucau       BIGSERIAL PRIMARY KEY,
    idnguoidung     BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE NOT NULL,
    tieude          VARCHAR(200) NOT NULL,
    noidung         TEXT NOT NULL,
    loai            VARCHAR(20) DEFAULT 'hotro',             -- 'hotro', 'gopy', 'loi_thietbi'
    trangthai       VARCHAR(20) DEFAULT 'moi',               -- 'moi', 'dang_xuly', 'da_xuly'
    id_thietbi_khoban BIGINT REFERENCES public.thietbi_khoban(id_thietbi) ON DELETE SET NULL, -- Thiết bị gặp lỗi
    thoigian_gui    TIMESTAMPTZ DEFAULT NOW(),
    thoigian_xuly   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.phanhoi_hotro (
    id_phanhoi      BIGSERIAL PRIMARY KEY,
    id_yeucau       BIGINT REFERENCES public.yeucau_hotro(id_yeucau) ON DELETE CASCADE NOT NULL,
    nguoi_phanhoi   BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE NOT NULL, -- Admin hoặc User phản hồi
    noidung         TEXT NOT NULL,
    thoigian        TIMESTAMPTZ DEFAULT NOW()
);



