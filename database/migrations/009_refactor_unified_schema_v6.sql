-- ============================================================
-- MIGRATION 009: Refactor Database to 3NF & Security Hardening
-- Chạy file này trên Supabase SQL Editor để nâng cấp DB hiện tại:
--   1. Chuyển idluat trong bảng luat sang sequence tự động (BIGSERIAL)
--   2. Đảm bảo cột loai_thongbao tồn tại trong nhatkyhoatdong
--   3. Thêm composite index tối ưu cho dữ liệu cảm biến
--   4. Đảm bảo RLS Policies hỗ trợ Admin & Owner toàn diện
--   5. Sửa lỗi function overload ambiguity (PGRST203)
-- ============================================================

-- 1. Sửa sequence cho bảng luat nếu đang dùng INT thủ công
CREATE SEQUENCE IF NOT EXISTS public.luat_idluat_seq;
ALTER TABLE public.luat ALTER COLUMN idluat SET DEFAULT nextval('public.luat_idluat_seq');
ALTER SEQUENCE public.luat_idluat_seq OWNED BY public.luat.idluat;
SELECT setval('public.luat_idluat_seq', COALESCE((SELECT MAX(idluat) FROM public.luat), 0) + 1, false);

-- 2. Cột loai_thongbao cho nhatkyhoatdong
ALTER TABLE public.nhatkyhoatdong ADD COLUMN IF NOT EXISTS loai_thongbao VARCHAR(30) DEFAULT 'user_action';

-- 3. Composite Index tối ưu truy vấn cảm biến
CREATE INDEX IF NOT EXISTS idx_dulieucambien_node_time ON public.dulieucambien(cambien_idnode, thoigian DESC);
CREATE INDEX IF NOT EXISTS idx_nhatkyhoatdong_loai_thongbao ON public.nhatkyhoatdong(loai_thongbao);

-- 4. Helper is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.nguoidung
        WHERE auth_uid = auth.uid() AND vaitro = 'admin'
    )
$$;

-- 5. Cập nhật RLS Policy SELECT & INSERT cho nhatkyhoatdong
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

-- 6. Khắc phục lỗi function overload ambiguity (PostgREST PGRST203)
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
