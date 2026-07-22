-- ============================================================
-- 01_TABLES.SQL — Cấu Trúc Bảng Cốt Lõi & Nghiệp Vụ
-- Định nghĩa 18 bảng dữ liệu chuẩn 3NF cho Smart Home IoT
-- ============================================================

-- 1. Bảng Người Dùng (liên kết với Supabase Auth)
CREATE TABLE IF NOT EXISTS public.nguoidung (
    idnguoidung BIGSERIAL PRIMARY KEY,
    auth_uid    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    hoten       VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    anhdaidien  TEXT,
    ngaysinh    DATE,
    sodienthoai VARCHAR(20),
    vaitro      VARCHAR(20) DEFAULT 'buyer',    -- 'buyer' | 'admin'
    trang_thai  VARCHAR(20) DEFAULT 'active',   -- 'active' | 'suspended'
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Gia Đình (Household)
CREATE TABLE IF NOT EXISTS public.hogiadinh (
    id_hogiadinh    BIGSERIAL PRIMARY KEY,
    ten_nha         VARCHAR(100) NOT NULL DEFAULT 'Nhà của tôi',
    dia_chi         TEXT,
    id_chuho        BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    thoigian_tao    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Thành Viên Gia Đình
CREATE TABLE IF NOT EXISTS public.thanhvien_hogiadinh (
    id_thanhvien        BIGSERIAL PRIMARY KEY,
    id_hogiadinh        BIGINT REFERENCES public.hogiadinh(id_hogiadinh) ON DELETE CASCADE NOT NULL,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE NOT NULL,
    vaitro              VARCHAR(20) DEFAULT 'member' NOT NULL,       -- 'owner' | 'member'
    quyen_dieu_khien    VARCHAR(20) DEFAULT 'full_control' NOT NULL, -- 'full_control' | 'view_only'
    thoigian_thamgia    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_hogiadinh, idnguoidung)
);

-- 4. Bảng Node Phần Cứng ESP32
CREATE TABLE IF NOT EXISTS public.esp32_nodes (
    idnode              VARCHAR(50) PRIMARY KEY,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ten_phong           VARCHAR(100) NOT NULL,
    ngay_kich_hoat      TIMESTAMPTZ DEFAULT NOW(),
    firmware_version    VARCHAR(20) DEFAULT '1.0.0',
    trang_thai          VARCHAR(20) DEFAULT 'offline',  -- 'online' | 'offline'
    last_heartbeat      TIMESTAMPTZ DEFAULT NOW(),
    uptime_percent      NUMERIC(5,2) DEFAULT 100.00,
    rssi                INT DEFAULT -50,
    flash_used          NUMERIC(5,2) DEFAULT 45.00,
    cpu_temp            NUMERIC(4,1) DEFAULT 40.0,
    pairing_token       UUID DEFAULT gen_random_uuid(),
    target_firmware     VARCHAR(20),
    ota_status          VARCHAR(20) DEFAULT 'idle',     -- 'idle' | 'pending' | 'updating' | 'success' | 'failed' | 'maintenance'
    trang_thai_duyet    VARCHAR(20) DEFAULT 'approved', -- 'pending' | 'approved' | 'rejected'
    chuc_nang           TEXT[] DEFAULT ARRAY['temp','humid','light','light_dev','fan_dev','ac_dev'],
    id_hogiadinh        BIGINT REFERENCES public.hogiadinh(id_hogiadinh) ON DELETE SET NULL,
    mo_ta               TEXT,
    loai_phong          VARCHAR(30) DEFAULT 'phong_khac', -- 'phong_ngu'|'phong_khach'|'nha_bep'|'phong_tam'|'ban_cong'|'phong_khac'
    gia_ban             NUMERIC(12,2) DEFAULT 450000.00,
    thoi_han_bao_hanh_thang INT DEFAULT 12
);

-- 5. Bảng Mã Mời Gia Đình
CREATE TABLE IF NOT EXISTS public.ma_moi (
    id_ma               BIGSERIAL PRIMARY KEY,
    id_hogiadinh        BIGINT REFERENCES public.hogiadinh(id_hogiadinh) ON DELETE CASCADE NOT NULL,
    ma_moi              UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    quyen_dieu_khien    VARCHAR(20) DEFAULT 'full_control' NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    is_used             BOOLEAN DEFAULT FALSE,
    used_by             BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    thoigian_su_dung    TIMESTAMPTZ,
    thoigian_tao        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng Thiết Bị
CREATE TABLE IF NOT EXISTS public.thietbi (
    id_thietbi          BIGSERIAL PRIMARY KEY,
    idnode              VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE CASCADE NOT NULL,
    loai_thietbi        VARCHAR(30) NOT NULL, -- 'den'|'quat'|'dieu_hoa'|'cam_bien_gas'|...
    ten_hienthi         VARCHAR(100),
    dia_chi_hw          VARCHAR(50),
    trangthai           INT DEFAULT 0,        -- 0=Tắt, 1=Bật
    tu_dong             BOOLEAN DEFAULT TRUE,
    cau_hinh            JSONB DEFAULT '{}',
    thoigian_tao        TIMESTAMPTZ DEFAULT NOW(),
    thoigian_capnhat    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bảng Luật Tự Động (Automation Rules)
CREATE TABLE IF NOT EXISTS public.luat (
    idluat      BIGSERIAL PRIMARY KEY,
    id_thietbi  BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE CASCADE,
    loaicambien VARCHAR(50) NOT NULL,  -- 'NhietDo' | 'DoAm' | 'AnhSang' | 'Gas'
    toantu      VARCHAR(10) NOT NULL,  -- '>' | '<' | '='
    nguong      NUMERIC(6,2) NOT NULL,
    automation  BOOLEAN DEFAULT TRUE
);

-- 8. Bảng Dữ Liệu Cảm Biến Realtime
CREATE TABLE IF NOT EXISTS public.dulieucambien (
    iddl            BIGSERIAL PRIMARY KEY,
    thoigian        TIMESTAMPTZ DEFAULT NOW(),
    nhietdo         NUMERIC(5,2),
    doam            NUMERIC(5,2),
    anhsang         NUMERIC(6,2),
    gas_ppm         NUMERIC(7,2),
    cambien         VARCHAR(50) DEFAULT 'ESP32',
    cambien_idnode  VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE SET NULL
);

-- 9. Bảng Nhật Ký Hoạt Động & Thông Báo
CREATE TABLE IF NOT EXISTS public.nhatkyhoatdong (
    idnhatky            BIGSERIAL PRIMARY KEY,
    idcambien           BIGINT REFERENCES public.dulieucambien(iddl) ON DELETE SET NULL,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ten_nguoi_thaotac   VARCHAR(100),
    idnode              VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE SET NULL,
    id_thietbi          BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE SET NULL,
    hanhdong            TEXT NOT NULL,
    loai_thongbao       VARCHAR(30) DEFAULT 'user_action', -- 'user_action'|'system_alert'|'admin_notification'|'user_to_admin'
    thoigian            TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bảng Lịch Hẹn Giờ
CREATE TABLE IF NOT EXISTS public.lichhengio (
    idid         BIGSERIAL PRIMARY KEY,
    id_thietbi   BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE CASCADE,
    hanhdong     VARCHAR(10) NOT NULL,  -- 'on' | 'off'
    thoigian     TIME NOT NULL,
    thu          INT[] NOT NULL,        -- 0=CN..6=T7
    kichhoat     BOOLEAN DEFAULT TRUE,
    idnode       VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE CASCADE,
    thoigian_tao TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Bảng Cảnh Báo Kỹ Thuật
CREATE TABLE IF NOT EXISTS public.canh_bao_ky_thuat (
    idcanhbao   BIGSERIAL PRIMARY KEY,
    idnode      VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE CASCADE,
    loai_loi    VARCHAR(50) NOT NULL,  -- 'sensor_timeout'|'gpio_error'|'mqtt_disconnect'|'rssi_weak'|'cpu_overheat'
    muc_do      VARCHAR(20) NOT NULL,  -- 'critical' | 'warning' | 'info'
    chi_tiet    TEXT NOT NULL,
    trang_thai  VARCHAR(20) DEFAULT 'unresolved',  -- 'unresolved' | 'resolved'
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Bảng Audit Log Hệ Thống
CREATE TABLE IF NOT EXISTS public.audit_log (
    idaudit     BIGSERIAL PRIMARY KEY,
    idnguoidung BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    hoten       VARCHAR(100),
    hanhdong    TEXT NOT NULL,
    chi_tiet    TEXT,
    ip_address  VARCHAR(45) DEFAULT '127.0.0.1',
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Bảng Node Khóa (Blocked Nodes)
CREATE TABLE IF NOT EXISTS public.blocked_nodes (
    id          BIGSERIAL PRIMARY KEY,
    idnode      VARCHAR(50) UNIQUE NOT NULL,
    idnguoidung BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ly_do       TEXT,
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Bảng Ticket Hỗ Trợ Kỹ Thuật
CREATE TABLE IF NOT EXISTS public.ho_tro_tickets (
    idticket            BIGSERIAL PRIMARY KEY,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE,
    tieu_de             VARCHAR(200) NOT NULL,
    noi_dung            TEXT NOT NULL,
    trang_thai          VARCHAR(20) DEFAULT 'new',  -- 'new' | 'processing' | 'resolved'
    phan_hoi            TEXT,
    thoigian            TIMESTAMPTZ DEFAULT NOW(),
    thoigian_capnhat    TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Bảng Đồng Ý Truy Cập Từ Xa (Remote Access Consent)
CREATE TABLE IF NOT EXISTS public.remote_access_consent (
    idconsent   BIGSERIAL PRIMARY KEY,
    idnguoidung BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE,
    admin_id    BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Các Bảng Kinh Doanh SaaS & Tài Chính
CREATE TABLE IF NOT EXISTS public.goi_dich_vu (
    id_goi        BIGSERIAL PRIMARY KEY,
    ten_goi       VARCHAR(100) NOT NULL UNIQUE,
    gia_tien      NUMERIC(12,2) NOT NULL,
    chu_ky_thang  INT NOT NULL DEFAULT 1,
    mo_ta         TEXT,
    thoigian_tao  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dang_ky_thue_bao (
    id_thue_bao   BIGSERIAL PRIMARY KEY,
    idnguoidung   BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE,
    id_goi        BIGINT REFERENCES public.goi_dich_vu(id_goi) ON DELETE SET NULL,
    ngay_bat_dau  TIMESTAMPTZ DEFAULT NOW(),
    ngay_het_han  TIMESTAMPTZ NOT NULL,
    trang_thai    VARCHAR(20) DEFAULT 'active',
    thoigian_tao  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.giao_dich_kinh_doanh (
    id_giao_dich   BIGSERIAL PRIMARY KEY,
    loai_giao_dich VARCHAR(20) NOT NULL,
    so_tien        NUMERIC(12,2) NOT NULL,
    idnguoidung    BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ref_id         VARCHAR(50),
    thoigian       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chi_phi_van_hanh (
    id_chi_phi   BIGSERIAL PRIMARY KEY,
    loai_chi_phi VARCHAR(50) NOT NULL,
    so_tien      NUMERIC(12,2) NOT NULL,
    mo_ta        TEXT,
    thoigian     TIMESTAMPTZ DEFAULT NOW()
);
