-- ============================================================
-- SMART HOME IoT — UNIFIED SCHEMA v6.0 (REFACTORED & OPTIMIZED)
-- Unified schema file cho Supabase SQL Editor.
-- Tối ưu hóa 3NF, sửa triệt để sequence PK, thắt chặt RLS,
-- bổ sung index hiệu năng cao và bảo tồn 100% tương thích ứng dụng.
-- ============================================================

-- ============================================================
-- 1. BẢNG CỐT LÕI (CORE TABLES)
-- ============================================================

-- Bảng Người Dùng (Profile liên kết với Supabase Auth)
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

-- Bảng Gia Đình (Household Management)
CREATE TABLE IF NOT EXISTS public.hogiadinh (
    id_hogiadinh    BIGSERIAL PRIMARY KEY,
    ten_nha         VARCHAR(100) NOT NULL DEFAULT 'Nhà của tôi',
    dia_chi         TEXT,
    id_chuho        BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    thoigian_tao    TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Thành Viên Gia Đình
CREATE TABLE IF NOT EXISTS public.thanhvien_hogiadinh (
    id_thanhvien        BIGSERIAL PRIMARY KEY,
    id_hogiadinh        BIGINT REFERENCES public.hogiadinh(id_hogiadinh) ON DELETE CASCADE NOT NULL,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE NOT NULL,
    vaitro              VARCHAR(20) DEFAULT 'member' NOT NULL,       -- 'owner' | 'member'
    quyen_dieu_khien    VARCHAR(20) DEFAULT 'full_control' NOT NULL, -- 'full_control' | 'view_only'
    thoigian_thamgia    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_hogiadinh, idnguoidung)
);

-- Bảng Node Phần Cứng ESP32 (Master Node Instance)
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

-- Bảng Mã Mời Gia Đình
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

-- Bảng Thiết Bị (Devices)
CREATE TABLE IF NOT EXISTS public.thietbi (
    id_thietbi          BIGSERIAL PRIMARY KEY,
    idnode              VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE CASCADE NOT NULL,
    loai_thietbi        VARCHAR(30) NOT NULL, -- 'den'|'quat'|'dieu_hoa'|'cam_bien_gas'|'cam_bien_nhietdo'|...
    ten_hienthi         VARCHAR(100),
    dia_chi_hw          VARCHAR(50),
    trangthai           INT DEFAULT 0,        -- 0=Tắt, 1=Bật
    tu_dong             BOOLEAN DEFAULT TRUE,
    cau_hinh            JSONB DEFAULT '{}',
    thoigian_tao        TIMESTAMPTZ DEFAULT NOW(),
    thoigian_capnhat    TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Luật Tự Động (Automation Rules) — FIX: idluat BIGSERIAL PRIMARY KEY
CREATE TABLE IF NOT EXISTS public.luat (
    idluat      BIGSERIAL PRIMARY KEY,
    id_thietbi  BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE CASCADE,
    loaicambien VARCHAR(50) NOT NULL,  -- 'NhietDo' | 'DoAm' | 'AnhSang' | 'Gas'
    toantu      VARCHAR(10) NOT NULL,  -- '>' | '<' | '='
    nguong      NUMERIC(6,2) NOT NULL,
    automation  BOOLEAN DEFAULT TRUE
);

-- Bảng Dữ Liệu Cảm Biến Realtime (Sensor Telemetry)
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

-- Bảng Nhật Ký Hoạt Động & Thông Báo (Activity Log & Notifications)
CREATE TABLE IF NOT EXISTS public.nhatkyhoatdong (
    idnhatky            BIGSERIAL PRIMARY KEY,
    idcambien           BIGINT REFERENCES public.dulieucambien(iddl) ON DELETE SET NULL,
    idnguoidung         BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ten_nguoi_thaotac   VARCHAR(100),
    idnode              VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE SET NULL,
    id_thietbi          BIGINT REFERENCES public.thietbi(id_thietbi) ON DELETE SET NULL,
    hanhdong            TEXT NOT NULL,
    loai_thongbao       VARCHAR(30) DEFAULT 'user_action', -- 'user_action' | 'system_alert' | 'admin_notification' | 'user_to_admin'
    thoigian            TIMESTAMPTZ DEFAULT NOW(),
    da_doc              BOOLEAN DEFAULT FALSE
);

ALTER TABLE IF EXISTS public.nhatkyhoatdong ADD COLUMN IF NOT EXISTS da_doc BOOLEAN DEFAULT FALSE;

-- Bảng Lịch Hẹn Giờ (Schedules)
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

-- Bảng Cảnh Báo Kỹ Thuật (Technical Alerts)
CREATE TABLE IF NOT EXISTS public.canh_bao_ky_thuat (
    idcanhbao   BIGSERIAL PRIMARY KEY,
    idnode      VARCHAR(50) REFERENCES public.esp32_nodes(idnode) ON DELETE CASCADE,
    loai_loi    VARCHAR(50) NOT NULL,  -- 'sensor_timeout'|'gpio_error'|'mqtt_disconnect'|'rssi_weak'|'cpu_overheat'
    muc_do      VARCHAR(20) NOT NULL,  -- 'critical' | 'warning' | 'info'
    chi_tiet    TEXT NOT NULL,
    trang_thai  VARCHAR(20) DEFAULT 'unresolved',  -- 'unresolved' | 'resolved'
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Nhật Ký Hệ Thống (Audit Log)
CREATE TABLE IF NOT EXISTS public.audit_log (
    idaudit     BIGSERIAL PRIMARY KEY,
    idnguoidung BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    hoten       VARCHAR(100),
    hanhdong    TEXT NOT NULL,
    chi_tiet    TEXT,
    ip_address  VARCHAR(45) DEFAULT '127.0.0.1',
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Node Khóa (Blocked Nodes)
CREATE TABLE IF NOT EXISTS public.blocked_nodes (
    id          BIGSERIAL PRIMARY KEY,
    idnode      VARCHAR(50) UNIQUE NOT NULL,
    idnguoidung BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ly_do       TEXT,
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Ticket Hỗ Trợ Kỹ Thuật (Support Tickets)
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

-- Bảng Đồng Ý Truy Cập Từ Xa (Remote Access Consent)
CREATE TABLE IF NOT EXISTS public.remote_access_consent (
    idconsent   BIGSERIAL PRIMARY KEY,
    idnguoidung BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE,
    admin_id    BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    thoigian    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. BUSINESS OPERATIONS TABLES (SAAS & E-COMMERCE)
-- ============================================================

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
    trang_thai    VARCHAR(20) DEFAULT 'active',  -- 'active' | 'cancelled' | 'expired'
    thoigian_tao  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.giao_dich_kinh_doanh (
    id_giao_dich   BIGSERIAL PRIMARY KEY,
    loai_giao_dich VARCHAR(20) NOT NULL,  -- 'subscription' | 'hardware'
    so_tien        NUMERIC(12,2) NOT NULL,
    idnguoidung    BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ref_id         VARCHAR(50),
    thoigian       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chi_phi_van_hanh (
    id_chi_phi   BIGSERIAL PRIMARY KEY,
    loai_chi_phi VARCHAR(50) NOT NULL,  -- 'server'|'marketing'|'maintenance'|'production'
    so_tien      NUMERIC(12,2) NOT NULL,
    mo_ta        TEXT,
    thoigian     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXES TỐI ƯU HIỆU NĂNG TRUY VẤN
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dulieucambien_thoigian          ON public.dulieucambien(thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_dulieucambien_cambien           ON public.dulieucambien(cambien);
CREATE INDEX IF NOT EXISTS idx_dulieucambien_idnode            ON public.dulieucambien(cambien_idnode);
CREATE INDEX IF NOT EXISTS idx_dulieucambien_node_time         ON public.dulieucambien(cambien_idnode, thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_thoigian         ON public.nhatkyhoatdong(thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_idnode           ON public.nhatkyhoatdong(idnode);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_id_thietbi       ON public.nhatkyhoatdong(id_thietbi);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_loai_thongbao     ON public.nhatkyhoatdong(loai_thongbao);
CREATE INDEX IF NOT EXISTS idx_lichhengio_kichhoat             ON public.lichhengio(kichhoat) WHERE kichhoat = true;
CREATE INDEX IF NOT EXISTS idx_thietbi_idnode                  ON public.thietbi(idnode);
CREATE INDEX IF NOT EXISTS idx_thietbi_loai                    ON public.thietbi(loai_thietbi);
CREATE INDEX IF NOT EXISTS idx_thanhvien_hogiadinh             ON public.thanhvien_hogiadinh(id_hogiadinh);
CREATE INDEX IF NOT EXISTS idx_thanhvien_nguoidung             ON public.thanhvien_hogiadinh(idnguoidung);
CREATE INDEX IF NOT EXISTS idx_thanhvien_quyen                 ON public.thanhvien_hogiadinh(quyen_dieu_khien);
CREATE INDEX IF NOT EXISTS idx_esp32_nodes_hogiadinh           ON public.esp32_nodes(id_hogiadinh);
CREATE INDEX IF NOT EXISTS idx_esp32_nodes_idnguoidung         ON public.esp32_nodes(idnguoidung);
CREATE INDEX IF NOT EXISTS idx_ma_moi_code                     ON public.ma_moi(ma_moi);
CREATE INDEX IF NOT EXISTS idx_ma_moi_hogiadinh                ON public.ma_moi(id_hogiadinh);
CREATE INDEX IF NOT EXISTS idx_ma_moi_expires                  ON public.ma_moi(expires_at) WHERE is_used = FALSE;

-- ============================================================
-- 4. HELPER FUNCTIONS & RLS POLICIES
-- ============================================================

-- Helper: Lấy idnguoidung từ auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT idnguoidung FROM public.nguoidung WHERE auth_uid = auth.uid()
$$;

-- Helper: Kiểm tra user hiện tại có phải admin không
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT vaitro INTO v_role FROM public.nguoidung WHERE auth_uid = auth.uid() LIMIT 1;
    RETURN COALESCE(v_role = 'admin', false);
END;
$$;

-- Helper: Kiểm tra user có thuộc household không
CREATE OR REPLACE FUNCTION public.is_household_member(p_id_hogiadinh BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.thanhvien_hogiadinh
        WHERE idnguoidung = public.current_user_id()
          AND id_hogiadinh = p_id_hogiadinh
    )
$$;

-- Helper: Lấy danh sách household ID mà user thuộc về
CREATE OR REPLACE FUNCTION public.user_household_ids()
RETURNS BIGINT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(ARRAY_AGG(id_hogiadinh), ARRAY[]::BIGINT[])
    FROM public.thanhvien_hogiadinh
    WHERE idnguoidung = public.current_user_id()
$$;

-- Bật RLS cho tất cả bảng
ALTER TABLE public.nguoidung             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hogiadinh             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thanhvien_hogiadinh   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esp32_nodes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thietbi               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dulieucambien         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luat                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lichhengio            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhatkyhoatdong        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canh_bao_ky_thuat     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_nodes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ho_tro_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remote_access_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ma_moi                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goi_dich_vu           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dang_ky_thue_bao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giao_dich_kinh_doanh  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chi_phi_van_hanh      ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- DEFINITION OF POLICIES WITH ADMIN & OWNER PERMISSIONS
-- ------------------------------------------------------------

-- 1. nguoidung
DROP POLICY IF EXISTS "nguoidung_select" ON public.nguoidung;
CREATE POLICY "nguoidung_select" ON public.nguoidung FOR SELECT USING (true);
DROP POLICY IF EXISTS "nguoidung_insert" ON public.nguoidung;
CREATE POLICY "nguoidung_insert" ON public.nguoidung FOR INSERT WITH CHECK (auth_uid = auth.uid());
DROP POLICY IF EXISTS "nguoidung_update" ON public.nguoidung;
CREATE POLICY "nguoidung_update" ON public.nguoidung FOR UPDATE USING (auth_uid = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "nguoidung_delete" ON public.nguoidung;
CREATE POLICY "nguoidung_delete" ON public.nguoidung FOR DELETE USING (auth_uid = auth.uid() OR public.is_admin());

-- 2. hogiadinh
DROP POLICY IF EXISTS "hogiadinh_select" ON public.hogiadinh;
CREATE POLICY "hogiadinh_select" ON public.hogiadinh FOR SELECT
    USING (id_chuho = public.current_user_id() OR public.is_household_member(id_hogiadinh) OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_insert" ON public.hogiadinh;
CREATE POLICY "hogiadinh_insert" ON public.hogiadinh FOR INSERT WITH CHECK (id_chuho = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_update" ON public.hogiadinh;
CREATE POLICY "hogiadinh_update" ON public.hogiadinh FOR UPDATE USING (id_chuho = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_delete" ON public.hogiadinh;
CREATE POLICY "hogiadinh_delete" ON public.hogiadinh FOR DELETE USING (id_chuho = public.current_user_id() OR public.is_admin());

-- 3. thanhvien_hogiadinh
DROP POLICY IF EXISTS "thanhvien_select" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_select" ON public.thanhvien_hogiadinh FOR SELECT
    USING (id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "thanhvien_insert" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_insert" ON public.thanhvien_hogiadinh FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "thanhvien_update" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_update" ON public.thanhvien_hogiadinh FOR UPDATE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "thanhvien_delete" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_delete" ON public.thanhvien_hogiadinh FOR DELETE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());

-- 4. esp32_nodes
DROP POLICY IF EXISTS "esp32_nodes_select" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_select" ON public.esp32_nodes FOR SELECT USING (true);
DROP POLICY IF EXISTS "esp32_nodes_insert" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_insert" ON public.esp32_nodes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "esp32_nodes_update" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_update" ON public.esp32_nodes FOR UPDATE
    USING (idnguoidung = public.current_user_id() OR public.is_admin()
        OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id()
            AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))
        OR (idnguoidung IS NULL AND public.current_user_id() IS NOT NULL)
        OR auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "esp32_nodes_delete" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_delete" ON public.esp32_nodes FOR DELETE
    USING (idnguoidung = public.current_user_id() OR public.is_admin());

-- 5. thietbi
DROP POLICY IF EXISTS "thietbi_select" ON public.thietbi;
CREATE POLICY "thietbi_select" ON public.thietbi FOR SELECT
    USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "thietbi_insert" ON public.thietbi;
CREATE POLICY "thietbi_insert" ON public.thietbi FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "thietbi_update" ON public.thietbi;
CREATE POLICY "thietbi_update" ON public.thietbi FOR UPDATE
    USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE idnguoidung = public.current_user_id()
        OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id()
            AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());
DROP POLICY IF EXISTS "thietbi_delete" ON public.thietbi;
CREATE POLICY "thietbi_delete" ON public.thietbi FOR DELETE
    USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE idnguoidung = public.current_user_id()
        OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id()
            AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());

-- 6. dulieucambien
DROP POLICY IF EXISTS "dulieucambien_select" ON public.dulieucambien;
CREATE POLICY "dulieucambien_select" ON public.dulieucambien FOR SELECT
    USING (cambien_idnode IS NULL OR cambien_idnode IN (
        SELECT idnode FROM public.esp32_nodes
        WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "dulieucambien_insert" ON public.dulieucambien;
CREATE POLICY "dulieucambien_insert" ON public.dulieucambien FOR INSERT WITH CHECK (true);

-- 7. luat
DROP POLICY IF EXISTS "luat_select" ON public.luat;
CREATE POLICY "luat_select" ON public.luat FOR SELECT
    USING (id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t
        JOIN public.esp32_nodes n ON n.idnode = t.idnode
        WHERE n.id_hogiadinh = ANY(public.user_household_ids()) OR n.idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "luat_insert" ON public.luat;
CREATE POLICY "luat_insert" ON public.luat FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "luat_update" ON public.luat;
CREATE POLICY "luat_update" ON public.luat FOR UPDATE
    USING (id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t
        JOIN public.esp32_nodes n ON n.idnode = t.idnode
        WHERE n.idnguoidung = public.current_user_id()
        OR (n.id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id()
            AND id_hogiadinh = n.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());
DROP POLICY IF EXISTS "luat_delete" ON public.luat;
CREATE POLICY "luat_delete" ON public.luat FOR DELETE
    USING (id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t
        JOIN public.esp32_nodes n ON n.idnode = t.idnode
        WHERE n.idnguoidung = public.current_user_id()
        OR (n.id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id()
            AND id_hogiadinh = n.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());

-- 8. lichhengio
DROP POLICY IF EXISTS "lichhengio_select" ON public.lichhengio;
CREATE POLICY "lichhengio_select" ON public.lichhengio FOR SELECT
    USING (idnode IN (SELECT idnode FROM public.esp32_nodes
        WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "lichhengio_insert" ON public.lichhengio;
CREATE POLICY "lichhengio_insert" ON public.lichhengio FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "lichhengio_update" ON public.lichhengio;
CREATE POLICY "lichhengio_update" ON public.lichhengio FOR UPDATE
    USING (idnode IN (SELECT idnode FROM public.esp32_nodes
        WHERE idnguoidung = public.current_user_id()
        OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id()
            AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());
DROP POLICY IF EXISTS "lichhengio_delete" ON public.lichhengio;
CREATE POLICY "lichhengio_delete" ON public.lichhengio FOR DELETE
    USING (idnode IN (SELECT idnode FROM public.esp32_nodes
        WHERE idnguoidung = public.current_user_id()
        OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (
            SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id()
            AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());

-- 9. nhatkyhoatdong (Fix Migration 008 routing)
DROP POLICY IF EXISTS "nhatkyhoatdong_select" ON public.nhatkyhoatdong;
CREATE POLICY "nhatkyhoatdong_select" ON public.nhatkyhoatdong FOR SELECT
    USING (
        (idnguoidung = public.current_user_id() AND loai_thongbao IN ('user_action', 'system_alert', 'admin_notification', 'user_to_admin'))
        OR (idnguoidung IS NULL AND loai_thongbao IN ('system_alert', 'admin_notification'))
        OR public.is_admin()
        OR idnode IN (SELECT idnode FROM public.esp32_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()))
    );
DROP POLICY IF EXISTS "nhatkyhoatdong_insert" ON public.nhatkyhoatdong;
CREATE POLICY "nhatkyhoatdong_insert" ON public.nhatkyhoatdong FOR INSERT WITH CHECK (true);

-- 10. canh_bao_ky_thuat
DROP POLICY IF EXISTS "canh_bao_ky_thuat_select" ON public.canh_bao_ky_thuat;
CREATE POLICY "canh_bao_ky_thuat_select" ON public.canh_bao_ky_thuat FOR SELECT
    USING (idnode IN (SELECT idnode FROM public.esp32_nodes
        WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "canh_bao_ky_thuat_update" ON public.canh_bao_ky_thuat;
CREATE POLICY "canh_bao_ky_thuat_update" ON public.canh_bao_ky_thuat FOR UPDATE USING (public.is_admin());

-- 11. ho_tro_tickets
DROP POLICY IF EXISTS "ho_tro_tickets_select" ON public.ho_tro_tickets;
CREATE POLICY "ho_tro_tickets_select" ON public.ho_tro_tickets FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "ho_tro_tickets_insert" ON public.ho_tro_tickets;
CREATE POLICY "ho_tro_tickets_insert" ON public.ho_tro_tickets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "ho_tro_tickets_update" ON public.ho_tro_tickets;
CREATE POLICY "ho_tro_tickets_update" ON public.ho_tro_tickets FOR UPDATE USING (idnguoidung = public.current_user_id() OR public.is_admin());

-- 12. remote_access_consent
DROP POLICY IF EXISTS "remote_access_consent_select" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_select" ON public.remote_access_consent FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "remote_access_consent_insert" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_insert" ON public.remote_access_consent FOR INSERT WITH CHECK (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "remote_access_consent_update" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_update" ON public.remote_access_consent FOR UPDATE USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "remote_access_consent_delete" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_delete" ON public.remote_access_consent FOR DELETE USING (idnguoidung = public.current_user_id() OR public.is_admin());

-- 13. audit_log
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT WITH CHECK (true);

-- 14. blocked_nodes
DROP POLICY IF EXISTS "blocked_nodes_select" ON public.blocked_nodes;
CREATE POLICY "blocked_nodes_select" ON public.blocked_nodes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "blocked_nodes_insert" ON public.blocked_nodes;
CREATE POLICY "blocked_nodes_insert" ON public.blocked_nodes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "blocked_nodes_delete" ON public.blocked_nodes;
CREATE POLICY "blocked_nodes_delete" ON public.blocked_nodes FOR DELETE USING (auth.role() = 'authenticated');

-- 15. ma_moi
DROP POLICY IF EXISTS "ma_moi_select" ON public.ma_moi;
CREATE POLICY "ma_moi_select" ON public.ma_moi FOR SELECT USING (true);
DROP POLICY IF EXISTS "ma_moi_insert" ON public.ma_moi;
CREATE POLICY "ma_moi_insert" ON public.ma_moi FOR INSERT WITH CHECK (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "ma_moi_update" ON public.ma_moi;
CREATE POLICY "ma_moi_update" ON public.ma_moi FOR UPDATE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "ma_moi_delete" ON public.ma_moi;
CREATE POLICY "ma_moi_delete" ON public.ma_moi FOR DELETE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());

-- 16. Business tables
DROP POLICY IF EXISTS "goi_dich_vu_select" ON public.goi_dich_vu;
CREATE POLICY "goi_dich_vu_select" ON public.goi_dich_vu FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "dang_ky_thue_bao_select" ON public.dang_ky_thue_bao;
CREATE POLICY "dang_ky_thue_bao_select" ON public.dang_ky_thue_bao FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "giao_dich_kinh_doanh_select" ON public.giao_dich_kinh_doanh;
CREATE POLICY "giao_dich_kinh_doanh_select" ON public.giao_dich_kinh_doanh FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "chi_phi_van_hanh_select" ON public.chi_phi_van_hanh;
CREATE POLICY "chi_phi_van_hanh_select" ON public.chi_phi_van_hanh FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- 5. REALTIME OPTIMIZATION
-- Thêm duy nhất các bảng cần tương thích UI sống trực tiếp
-- ============================================================

DO $$
BEGIN
  PERFORM pg_catalog.set_config('search_path', 'public', false);
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.luat; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.nhatkyhoatdong; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lichhengio; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.esp32_nodes; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.canh_bao_ky_thuat; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ho_tro_tickets; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hogiadinh; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.thietbi; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Tự động tạo profile nguoidung khi user đăng ký Auth
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.nguoidung (auth_uid, hoten, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email
  ) ON CONFLICT (auth_uid) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Tự động cập nhật thoigian_capnhat khi UPDATE thietbi
DROP FUNCTION IF EXISTS public.update_thietbi_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION public.update_thietbi_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.thoigian_capnhat = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_thietbi_updated ON public.thietbi;
CREATE TRIGGER trg_thietbi_updated
  BEFORE UPDATE ON public.thietbi
  FOR EACH ROW EXECUTE PROCEDURE public.update_thietbi_timestamp();

-- ============================================================
-- 7. STORED RPC FUNCTIONS
-- ============================================================

-- Lấy node + danh sách thiết bị theo household
DROP FUNCTION IF EXISTS public.get_nodes_with_devices(BIGINT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_nodes_with_devices(p_id_hogiadinh BIGINT)
RETURNS TABLE (idnode VARCHAR, ten_phong VARCHAR, loai_phong VARCHAR, mo_ta TEXT, trang_thai VARCHAR, thietbi_list JSONB)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT n.idnode, n.ten_phong, n.loai_phong, n.mo_ta, n.trang_thai,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id_thietbi', t.id_thietbi, 'loai_thietbi', t.loai_thietbi,
            'ten_hienthi', t.ten_hienthi, 'dia_chi_hw', t.dia_chi_hw,
            'trangthai', t.trangthai, 'tu_dong', t.tu_dong,
            'cau_hinh', t.cau_hinh
        )) FILTER (WHERE t.id_thietbi IS NOT NULL), '[]'::JSONB) AS thietbi_list
    FROM public.esp32_nodes n
    LEFT JOIN public.thietbi t ON t.idnode = n.idnode
    WHERE n.id_hogiadinh = p_id_hogiadinh AND n.idnode != 'SYSTEM_CONFIG'
    GROUP BY n.idnode, n.ten_phong, n.loai_phong, n.mo_ta, n.trang_thai
    ORDER BY n.ten_phong;
END;
$$;

-- Dọn dẹp dữ liệu cũ (Data Retention: 30 ngày cảm biến, 90 ngày nhật ký)
DROP FUNCTION IF EXISTS public.cleanup_old_data() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE sensor_count INT; log_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can call cleanup_old_data()';
  END IF;
  DELETE FROM public.dulieucambien WHERE thoigian < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS sensor_count = ROW_COUNT;
  DELETE FROM public.nhatkyhoatdong WHERE thoigian < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS log_count = ROW_COUNT;
  RETURN format('Đã xóa %s bản ghi cảm biến và %s bản ghi nhật ký', sensor_count, log_count);
END;
$$;

-- Xu hướng cảm biến theo bucket 2 phút (24h gần nhất)
DROP FUNCTION IF EXISTS public.get_sensor_trend_2min() CASCADE;
CREATE OR REPLACE FUNCTION public.get_sensor_trend_2min()
RETURNS TABLE (time_bucket TIMESTAMPTZ, avg_temp NUMERIC, avg_humidity NUMERIC, avg_light NUMERIC, avg_gas NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH ts AS (
        SELECT generate_series(
            to_timestamp(floor(extract(epoch FROM NOW()-INTERVAL '24 hours')/120)*120),
            to_timestamp(floor(extract(epoch FROM NOW())/120)*120),
            INTERVAL '2 minutes') AS bucket
    ),
    agg AS (
        SELECT to_timestamp(floor(extract(epoch FROM thoigian)/120)*120) AS tb,
               AVG(nhietdo) AS t, AVG(doam) AS h, AVG(anhsang) AS l, AVG(gas_ppm) AS g
        FROM public.dulieucambien WHERE thoigian >= NOW() - INTERVAL '24 hours' GROUP BY tb
    )
    SELECT ts.bucket, ROUND(agg.t,2), ROUND(agg.h,2), ROUND(agg.l,2), ROUND(agg.g,2)
    FROM ts LEFT JOIN agg ON ts.bucket = agg.tb ORDER BY ts.bucket;
END;
$$;

-- Xu hướng cảm biến theo range: 'today' | '7d' | '30d'; filter theo node tuỳ chọn
DROP FUNCTION IF EXISTS public.get_sensor_trend(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_sensor_trend(range_type TEXT, p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (label TEXT, temp NUMERIC, humid NUMERIC, light NUMERIC, gas NUMERIC,
               temp_prev_avg NUMERIC, humid_prev_avg NUMERIC, light_prev_avg NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF range_type = 'today' THEN
        RETURN QUERY
        WITH hs AS (SELECT generate_series(
            DATE_TRUNC('hour', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '23 hours',
            DATE_TRUNC('hour', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'), INTERVAL '1 hour') AS hr),
        hd AS (SELECT DATE_TRUNC('hour', thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh') AS hr,
                      AVG(nhietdo) AS t, AVG(doam) AS h, AVG(anhsang) AS l, AVG(gas_ppm) AS g
               FROM public.dulieucambien
               WHERE thoigian >= NOW() - INTERVAL '23 hours'
                 AND (p_node_id IS NULL OR cambien_idnode = p_node_id) GROUP BY 1)
        SELECT TO_CHAR(hs.hr,'HH24:MI')::TEXT,
               ROUND(hd.t,1)::NUMERIC, ROUND(hd.h,1)::NUMERIC, ROUND(hd.l,1)::NUMERIC, ROUND(hd.g,1)::NUMERIC,
               NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC
        FROM hs LEFT JOIN hd ON hs.hr = hd.hr ORDER BY hs.hr;
    ELSIF range_type IN ('7d','30d') THEN
        RETURN QUERY
        WITH ds AS (SELECT generate_series(
            DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - (CASE WHEN range_type='7d' THEN 6 ELSE 29 END || ' days')::INTERVAL,
            DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'), INTERVAL '1 day') AS dy),
        dd AS (SELECT DATE_TRUNC('day', thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh') AS dy,
                      AVG(nhietdo) AS t, AVG(doam) AS h, AVG(anhsang) AS l, AVG(gas_ppm) AS g
               FROM public.dulieucambien
               WHERE thoigian >= NOW() - (CASE WHEN range_type='7d' THEN 6 ELSE 29 END || ' days')::INTERVAL
                 AND (p_node_id IS NULL OR cambien_idnode = p_node_id) GROUP BY 1)
        SELECT TO_CHAR(ds.dy,'DD/MM')::TEXT,
               ROUND(dd.t,1)::NUMERIC, ROUND(dd.h,1)::NUMERIC, ROUND(dd.l,1)::NUMERIC, ROUND(dd.g,1)::NUMERIC,
               NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC
        FROM ds LEFT JOIN dd ON ds.dy = dd.dy ORDER BY ds.dy;
    END IF;
END;
$$;

-- Heatmap cảm biến theo ngày/giờ trong tuần
DROP FUNCTION IF EXISTS public.get_sensor_heatmap() CASCADE;
DROP FUNCTION IF EXISTS public.get_sensor_heatmap(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_sensor_heatmap(p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (dow INT, hr INT, avg_temp NUMERIC, avg_humid NUMERIC, avg_light NUMERIC, avg_gas NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT EXTRACT(ISODOW FROM thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT,
           EXTRACT(HOUR  FROM thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT,
           ROUND(AVG(nhietdo),1)::NUMERIC, ROUND(AVG(doam),1)::NUMERIC,
           ROUND(AVG(anhsang),1)::NUMERIC, ROUND(AVG(gas_ppm),1)::NUMERIC
    FROM public.dulieucambien
    WHERE thoigian >= NOW() - INTERVAL '8 days'
      AND (p_node_id IS NULL OR cambien_idnode = p_node_id)
    GROUP BY 1,2 ORDER BY 1,2;
END;
$$;

-- Tham gia household bằng mã mời
DROP FUNCTION IF EXISTS public.join_by_invite_code(UUID, BIGINT) CASCADE;
CREATE OR REPLACE FUNCTION public.join_by_invite_code(p_ma_moi UUID, p_idnguoidung BIGINT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_record public.ma_moi%ROWTYPE; v_exists BOOLEAN;
BEGIN
    SELECT * INTO v_record FROM public.ma_moi WHERE ma_moi = p_ma_moi;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF v_record.is_used THEN RETURN 'already_used'; END IF;
    IF v_record.expires_at < NOW() THEN RETURN 'expired'; END IF;
    SELECT EXISTS(SELECT 1 FROM public.thanhvien_hogiadinh
        WHERE id_hogiadinh = v_record.id_hogiadinh AND idnguoidung = p_idnguoidung) INTO v_exists;
    IF v_exists THEN RETURN 'already_member'; END IF;
    INSERT INTO public.thanhvien_hogiadinh (id_hogiadinh, idnguoidung, vaitro, quyen_dieu_khien)
    VALUES (v_record.id_hogiadinh, p_idnguoidung, 'member', v_record.quyen_dieu_khien);
    UPDATE public.ma_moi SET is_used=TRUE, used_by=p_idnguoidung, thoigian_su_dung=NOW() WHERE id_ma=v_record.id_ma;
    RETURN 'ok';
END;
$$;

-- Tạo household mới và gán owner
DROP FUNCTION IF EXISTS public.create_household(VARCHAR, TEXT, BIGINT) CASCADE;
CREATE OR REPLACE FUNCTION public.create_household(p_ten_nha VARCHAR, p_dia_chi TEXT, p_idnguoidung BIGINT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id_hogiadinh BIGINT;
BEGIN
    -- Tự động đồng bộ sequence nếu bị lệch dữ liệu seed
    PERFORM setval('public.hogiadinh_id_hogiadinh_seq', COALESCE((SELECT MAX(id_hogiadinh) FROM public.hogiadinh), 0) + 1, false);

    INSERT INTO public.hogiadinh (ten_nha, dia_chi, id_chuho) VALUES (p_ten_nha, p_dia_chi, p_idnguoidung)
    RETURNING id_hogiadinh INTO v_id_hogiadinh;
    INSERT INTO public.thanhvien_hogiadinh (id_hogiadinh, idnguoidung, vaitro, quyen_dieu_khien)
    VALUES (v_id_hogiadinh, p_idnguoidung, 'owner', 'full_control');

    -- Tự động gán các node của chủ hộ vào Hộ gia đình vừa tạo
    UPDATE public.esp32_nodes
    SET id_hogiadinh = v_id_hogiadinh
    WHERE (idnguoidung = p_idnguoidung OR id_hogiadinh IS NULL OR id_hogiadinh = 1)
      AND idnode != 'SYSTEM_CONFIG';

    RETURN v_id_hogiadinh;
END;
$$;

-- Anomaly detection context
DROP FUNCTION IF EXISTS public.get_anomaly_context(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_anomaly_context(p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (hour_slot INT, avg_temp NUMERIC, stddev_temp NUMERIC, avg_humid NUMERIC, stddev_humid NUMERIC,
               avg_light NUMERIC, stddev_light NUMERIC, avg_gas NUMERIC, stddev_gas NUMERIC, sample_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT EXTRACT(HOUR FROM d.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT,
           ROUND(AVG(d.nhietdo),2)::NUMERIC,    ROUND(STDDEV(d.nhietdo),2)::NUMERIC,
           ROUND(AVG(d.doam),2)::NUMERIC,        ROUND(STDDEV(d.doam),2)::NUMERIC,
           ROUND(AVG(d.anhsang),2)::NUMERIC,     ROUND(STDDEV(d.anhsang),2)::NUMERIC,
           ROUND(AVG(d.gas_ppm),2)::NUMERIC,     ROUND(STDDEV(d.gas_ppm),2)::NUMERIC,
           COUNT(*)::BIGINT
    FROM public.dulieucambien d
    WHERE d.thoigian >= NOW() - INTERVAL '7 days'
      AND (p_node_id IS NULL OR d.cambien_idnode = p_node_id)
    GROUP BY 1 ORDER BY 1;
END;
$$;

-- Gas readings gần nhất
DROP FUNCTION IF EXISTS public.get_recent_gas_readings(TEXT, INT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_recent_gas_readings(
    p_node_id TEXT DEFAULT 'ESP32-C3-Kitchen', p_limit INT DEFAULT 10)
RETURNS TABLE (iddl BIGINT, gas_ppm NUMERIC, thoigian TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT d.iddl, d.gas_ppm, d.thoigian FROM public.dulieucambien d
    WHERE d.cambien_idnode = p_node_id AND d.gas_ppm IS NOT NULL
    ORDER BY d.thoigian DESC LIMIT p_limit;
END;
$$;

-- Thống kê bật/tắt thiết bị theo node trong 7 ngày
DROP FUNCTION IF EXISTS public.get_device_usage_stats(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_device_usage_stats(p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (idnode VARCHAR, ten_phong VARCHAR, device_name TEXT, loai_thietbi VARCHAR,
               total_toggles BIGINT, on_count BIGINT, off_count BIGINT,
               peak_hour INT, earliest_event TIMESTAMPTZ, latest_event TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH activity AS (
        SELECT nk.idnode AS nk_idnode, nk.id_thietbi, nk.hanhdong, nk.thoigian AS nk_thoigian
        FROM public.nhatkyhoatdong nk
        WHERE nk.thoigian >= NOW() - INTERVAL '7 days' AND nk.idnode IS NOT NULL
          AND (p_node_id IS NULL OR nk.idnode = p_node_id)
    ),
    toggle_stats AS (
        SELECT a.nk_idnode, a.id_thietbi,
               COUNT(*) AS total_tgl,
               COUNT(*) FILTER (WHERE a.hanhdong ILIKE '%Bật%' OR a.hanhdong ILIKE '%on%') AS on_cnt,
               COUNT(*) FILTER (WHERE a.hanhdong ILIKE '%Tắt%' OR a.hanhdong ILIKE '%off%') AS off_cnt,
               MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM a.nk_thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT) AS pk_hour,
               MIN(a.nk_thoigian) AS first_evt, MAX(a.nk_thoigian) AS last_evt
        FROM activity a GROUP BY a.nk_idnode, a.id_thietbi
    )
    SELECT n.idnode, n.ten_phong,
           COALESCE(t.ten_hienthi,'Thiết bị')::TEXT, t.loai_thietbi,
           COALESCE(ts.total_tgl,0)::BIGINT, COALESCE(ts.on_cnt,0)::BIGINT, COALESCE(ts.off_cnt,0)::BIGINT,
           ts.pk_hour::INT, ts.first_evt, ts.last_evt
    FROM public.thietbi t
    JOIN public.esp32_nodes n ON n.idnode = t.idnode
    LEFT JOIN toggle_stats ts ON ts.id_thietbi = t.id_thietbi AND ts.nk_idnode = n.idnode
    WHERE n.idnode != 'SYSTEM_CONFIG' AND (p_node_id IS NULL OR n.idnode = p_node_id)
    ORDER BY n.ten_phong, t.loai_thietbi;
END;
$$;

-- Data context tổng hợp cho Gemini AI Chat Q&A
DROP FUNCTION IF EXISTS public.get_ai_chat_context(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_ai_chat_context(p_range TEXT DEFAULT 'today', p_node_id TEXT DEFAULT NULL)
RETURNS TABLE (context_type TEXT, context_key TEXT, context_value TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_interval INTERVAL;
BEGIN
    v_interval := CASE p_range WHEN '7d' THEN INTERVAL '7 days' WHEN '30d' THEN INTERVAL '30 days' ELSE INTERVAL '24 hours' END;

    RETURN QUERY  -- Sensor summary
    SELECT 'sensor_summary'::TEXT, 'overview'::TEXT,
        format('Nhiệt độ: min=%s°C, max=%s°C, avg=%s°C | Độ ẩm: min=%s%%, max=%s%%, avg=%s%% | Ánh sáng: min=%s lx, max=%s lx, avg=%s lx | Gas: min=%s ppm, max=%s ppm, avg=%s ppm | Mẫu: %s',
               ROUND(MIN(d.nhietdo)::numeric,1), ROUND(MAX(d.nhietdo)::numeric,1), ROUND(AVG(d.nhietdo)::numeric,1),
               ROUND(MIN(d.doam)::numeric,1), ROUND(MAX(d.doam)::numeric,1), ROUND(AVG(d.doam)::numeric,1),
               ROUND(MIN(d.anhsang)::numeric,0), ROUND(MAX(d.anhsang)::numeric,0), ROUND(AVG(d.anhsang)::numeric,0),
               ROUND(MIN(d.gas_ppm)::numeric,0), ROUND(MAX(d.gas_ppm)::numeric,0), ROUND(AVG(d.gas_ppm)::numeric,0),
               COUNT(*)::TEXT)::TEXT
    FROM public.dulieucambien d WHERE d.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR d.cambien_idnode=p_node_id);

    RETURN QUERY  -- Hourly breakdown
    SELECT 'hourly_breakdown'::TEXT,
        LPAD(EXTRACT(HOUR FROM d.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::TEXT, 2, '0') || ':00',
        format('temp=%s, humid=%s, light=%s, gas=%s',
               ROUND(AVG(d.nhietdo)::numeric,1), ROUND(AVG(d.doam)::numeric,1), ROUND(AVG(d.anhsang)::numeric,0), ROUND(AVG(d.gas_ppm)::numeric,0))::TEXT
    FROM public.dulieucambien d WHERE d.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR d.cambien_idnode=p_node_id)
    GROUP BY EXTRACT(HOUR FROM d.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT ORDER BY 2;

    RETURN QUERY  -- Device status
    SELECT 'device_status'::TEXT,
        format('%s (%s)', t.ten_hienthi, n.ten_phong)::TEXT,
        format('trạng thái=%s, chế_độ=%s, cập_nhật_lúc=%s',
               CASE WHEN t.trangthai=1 THEN 'BẬT' ELSE 'TẮT' END,
               CASE WHEN t.tu_dong THEN 'Tự động' ELSE 'Thủ công' END,
               TO_CHAR(t.thoigian_capnhat AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM HH24:MI'))::TEXT
    FROM public.thietbi t JOIN public.esp32_nodes n ON n.idnode=t.idnode
    WHERE n.idnode!='SYSTEM_CONFIG' AND (p_node_id IS NULL OR n.idnode=p_node_id);

    RETURN QUERY  -- Recent activity (20 events)
    SELECT 'recent_activity'::TEXT,
        TO_CHAR(nk.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM HH24:MI')::TEXT,
        format('%s [node: %s]', nk.hanhdong, COALESCE(nk.idnode,'N/A'))::TEXT
    FROM public.nhatkyhoatdong nk WHERE nk.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR nk.idnode=p_node_id)
    ORDER BY nk.thoigian DESC LIMIT 20;

    RETURN QUERY  -- Active schedules
    SELECT 'schedules'::TEXT, format('ID %s', lh.idid)::TEXT,
        format('id_thietbi=%s, hành_động=%s, giờ=%s, thứ=%s, kích_hoạt=%s',
               COALESCE(lh.id_thietbi::TEXT,'N/A'), lh.hanhdong, lh.thoigian::TEXT,
               array_to_string(lh.thu,','), CASE WHEN lh.kichhoat THEN 'Có' ELSE 'Không' END)::TEXT
    FROM public.lichhengio lh WHERE (p_node_id IS NULL OR lh.idnode=p_node_id);

    RETURN QUERY  -- Recent technical alerts
    SELECT 'technical_alerts'::TEXT, format('%s [%s]', cb.loai_loi, cb.muc_do)::TEXT,
        format('%s (node: %s, trạng_thái: %s, lúc: %s)', cb.chi_tiet, cb.idnode, cb.trang_thai,
               TO_CHAR(cb.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh','DD/MM HH24:MI'))::TEXT
    FROM public.canh_bao_ky_thuat cb WHERE cb.thoigian >= NOW()-v_interval AND (p_node_id IS NULL OR cb.idnode=p_node_id)
    ORDER BY cb.thoigian DESC LIMIT 10;
END;
$$;

-- Peak hours theo metric
DROP FUNCTION IF EXISTS public.get_peak_hours(TEXT, TEXT, TEXT, INT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_peak_hours(
    p_metric TEXT DEFAULT 'nhietdo', p_range TEXT DEFAULT '7d', p_node_id TEXT DEFAULT NULL, p_top_n INT DEFAULT 5)
RETURNS TABLE (hour_slot INT, avg_value NUMERIC, max_value NUMERIC, min_value NUMERIC, readings BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_interval INTERVAL;
BEGIN
    v_interval := CASE p_range WHEN 'today' THEN INTERVAL '24 hours' WHEN '30d' THEN INTERVAL '30 days' ELSE INTERVAL '7 days' END;
    RETURN QUERY EXECUTE format(
        'SELECT EXTRACT(HOUR FROM thoigian AT TIME ZONE ''Asia/Ho_Chi_Minh'')::INT,
                ROUND(AVG(%I),2)::NUMERIC, ROUND(MAX(%I),2)::NUMERIC, ROUND(MIN(%I),2)::NUMERIC, COUNT(*)::BIGINT
         FROM public.dulieucambien
         WHERE thoigian >= NOW()-$1 AND %I IS NOT NULL AND ($2 IS NULL OR cambien_idnode=$2)
         GROUP BY 1 ORDER BY avg_value DESC LIMIT $3',
        p_metric, p_metric, p_metric, p_metric
    ) USING v_interval, p_node_id, p_top_n;
END;
$$;

-- ============================================================
-- 8. SEED DATA MẪU
-- ============================================================

INSERT INTO public.esp32_nodes (idnode, ten_phong, trang_thai, rssi, cpu_temp, flash_used, ota_status) VALUES
('SYSTEM_CONFIG', 'System Configuration', 'online', -80, 65, 60, 'idle')
ON CONFLICT (idnode) DO NOTHING;

INSERT INTO public.esp32_nodes (idnode, ten_phong, firmware_version, trang_thai, last_heartbeat, uptime_percent, rssi, flash_used, cpu_temp, loai_phong, mo_ta, trang_thai_duyet) VALUES
('ESP32-S3-Node-01', 'Phòng khách', '1.0.0', 'offline', NOW()-INTERVAL '5 minutes',  99.42, -62, 45.20, 38.5, 'phong_khach', 'Phòng khách chính tầng 1', 'approved'),
('ESP32-S3-Node-02', 'Phòng ngủ',   '1.0.0', 'offline', NOW()-INTERVAL '10 minutes', 98.90, -68, 48.10, 41.2, 'phong_ngu',   'Phòng ngủ chính tầng 2',  'approved'),
('ESP32-C3-Kitchen', 'Nhà bếp',     '0.9.8', 'offline', NOW()-INTERVAL '12 hours',   92.15, -75, 52.40, 45.0, 'nha_bep',     'Nhà bếp tầng 1',           'approved')
ON CONFLICT (idnode) DO NOTHING;

INSERT INTO public.hogiadinh (id_hogiadinh, ten_nha, dia_chi) VALUES
(1, 'Nhà Mặc Định', 'Hà Nội, Việt Nam') ON CONFLICT (id_hogiadinh) DO NOTHING;

SELECT setval('public.hogiadinh_id_hogiadinh_seq', (SELECT COALESCE(MAX(id_hogiadinh), 1) FROM public.hogiadinh));

UPDATE public.esp32_nodes SET id_hogiadinh = 1
WHERE idnode IN ('ESP32-S3-Node-01','ESP32-S3-Node-02','ESP32-C3-Kitchen');

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

INSERT INTO public.luat (idluat, id_thietbi, loaicambien, toantu, nguong, automation) VALUES
(1, 1, 'NhietDo', '>', 30.0, true),
(2, 2, 'DoAm',    '>', 75.0, true),
(3, 3, 'AnhSang', '<', 200.0, true)
ON CONFLICT (idluat) DO NOTHING;

SELECT setval('public.luat_idluat_seq', (SELECT MAX(idluat) FROM public.luat));

INSERT INTO public.lichhengio (idid, id_thietbi, hanhdong, thoigian, thu, kichhoat) VALUES
(1, 3, 'on',  '18:30:00', ARRAY[1,2,3,4,5], true),
(2, 1, 'off', '07:00:00', ARRAY[0,1,2,3,4,5,6], true),
(3, 2, 'on',  '13:00:00', ARRAY[0,6], false)
ON CONFLICT (idid) DO NOTHING;

SELECT setval('public.lichhengio_idid_seq', (SELECT MAX(idid) FROM public.lichhengio));

INSERT INTO public.goi_dich_vu (ten_goi, gia_tien, chu_ky_thang, mo_ta) VALUES
('Free Tier',            0.00,  1, 'Giám sát cơ bản, lịch sử 24h, tối đa 1 nhà.'),
('AI Smart Standard', 49000.00, 1, 'AI phân tích xu hướng, cảnh báo Telegram, lịch sử 30 ngày.'),
('Premium AI Smart Pro', 99000.00, 1, 'AI Assistant, phát hiện gas rò rỉ, camera RTSP, bảo hành vàng.')
ON CONFLICT (ten_goi) DO UPDATE SET gia_tien=EXCLUDED.gia_tien, mo_ta=EXCLUDED.mo_ta;
