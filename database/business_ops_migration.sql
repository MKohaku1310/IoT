-- ============================================================
-- SQL SETUP CHO BẢNG KINH DOANH & PHÂN TÍCH TÀI CHÍNH (ADMIN)
-- ============================================================

-- 1. BẢNG GÓI DỊCH VỤ PREMIUM
CREATE TABLE IF NOT EXISTS public.goi_dich_vu (
    id_goi        BIGSERIAL PRIMARY KEY,
    ten_goi       VARCHAR(100) NOT NULL UNIQUE,
    gia_tien      NUMERIC(12, 2) NOT NULL,
    chu_ky_thang  INT NOT NULL DEFAULT 1,
    mo_ta         TEXT,
    thoigian_tao  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG ĐĂNG KÝ THUÊ BAO
CREATE TABLE IF NOT EXISTS public.dang_ky_thue_bao (
    id_thue_bao   BIGSERIAL PRIMARY KEY,
    idnguoidung   BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE,
    id_goi        BIGINT REFERENCES public.goi_dich_vu(id_goi) ON DELETE SET NULL,
    ngay_bat_dau  TIMESTAMPTZ DEFAULT NOW(),
    ngay_het_han  TIMESTAMPTZ NOT NULL,
    trang_thai    VARCHAR(20) DEFAULT 'active', -- 'active' | 'cancelled' | 'expired'
    thoigian_tao  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG LỊCH SỬ GIAO DỊCH KINH DOANH
CREATE TABLE IF NOT EXISTS public.giao_dich_kinh_doanh (
    id_giao_dich   BIGSERIAL PRIMARY KEY,
    loai_giao_dich VARCHAR(20) NOT NULL, -- 'subscription' | 'hardware'
    so_tien        NUMERIC(12, 2) NOT NULL,
    idnguoidung    BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ref_id         VARCHAR(50),
    thoigian       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG CHI PHÍ VẬN HÀNH
CREATE TABLE IF NOT EXISTS public.chi_phi_van_hanh (
    id_chi_phi   BIGSERIAL PRIMARY KEY,
    loai_chi_phi VARCHAR(50) NOT NULL, -- 'server' | 'marketing' | 'maintenance' | 'production'
    so_tien      NUMERIC(12, 2) NOT NULL,
    mo_ta        TEXT,
    thoigian     TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CẬP NHẬT CỘT BẢO HÀNH CHO CÁC NODE
ALTER TABLE public.esp32_nodes 
ADD COLUMN IF NOT EXISTS gia_ban NUMERIC(12, 2) DEFAULT 450000.00,
ADD COLUMN IF NOT EXISTS thoi_han_bao_hanh_thang INT DEFAULT 12;

-- ============================================================
-- PHÂN QUYỀN VÀ BẢO MẬT ROW-LEVEL SECURITY (RLS)
-- Cho phép Admin Full quyền (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================

ALTER TABLE public.goi_dich_vu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dang_ky_thue_bao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giao_dich_kinh_doanh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chi_phi_van_hanh ENABLE ROW LEVEL SECURITY;

-- 1. goi_dich_vu policies
DROP POLICY IF EXISTS "goi_dich_vu_admin_all" ON public.goi_dich_vu;
CREATE POLICY "goi_dich_vu_admin_all" ON public.goi_dich_vu FOR ALL USING (auth.role() = 'authenticated');

-- 2. dang_ky_thue_bao policies
DROP POLICY IF EXISTS "dang_ky_thue_bao_all" ON public.dang_ky_thue_bao;
CREATE POLICY "dang_ky_thue_bao_all" ON public.dang_ky_thue_bao FOR ALL USING (auth.role() = 'authenticated');

-- 3. giao_dich_kinh_doanh policies
DROP POLICY IF EXISTS "giao_dich_kinh_doanh_all" ON public.giao_dich_kinh_doanh;
CREATE POLICY "giao_dich_kinh_doanh_all" ON public.giao_dich_kinh_doanh FOR ALL USING (auth.role() = 'authenticated');

-- 4. chi_phi_van_hanh policies
DROP POLICY IF EXISTS "chi_phi_van_hanh_all" ON public.chi_phi_van_hanh;
CREATE POLICY "chi_phi_van_hanh_all" ON public.chi_phi_van_hanh FOR ALL USING (auth.role() = 'authenticated');
