-- ============================================================
-- 02_SECURITY_RLS.SQL — Phân Quyền Bảo Mật Row Level Security
-- Helper functions & RLS policies cho Admin và Buyer/Owner
-- ============================================================

-- 1. HELPER SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT idnguoidung FROM public.nguoidung WHERE auth_uid = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.nguoidung
        WHERE auth_uid = auth.uid() AND vaitro = 'admin'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_household_member(p_id_hogiadinh BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.thanhvien_hogiadinh
        WHERE idnguoidung = public.current_user_id()
          AND id_hogiadinh = p_id_hogiadinh
    )
$$;

CREATE OR REPLACE FUNCTION public.user_household_ids()
RETURNS BIGINT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(ARRAY_AGG(id_hogiadinh), ARRAY[]::BIGINT[])
    FROM public.thanhvien_hogiadinh
    WHERE idnguoidung = public.current_user_id()
$$;

-- 2. BẬT ROW LEVEL SECURITY (RLS)
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

-- 3. POLICIES PHÂN QUYỀN
-- 3.1. nguoidung
DROP POLICY IF EXISTS "nguoidung_select" ON public.nguoidung;
CREATE POLICY "nguoidung_select" ON public.nguoidung FOR SELECT USING (true);
DROP POLICY IF EXISTS "nguoidung_insert" ON public.nguoidung;
CREATE POLICY "nguoidung_insert" ON public.nguoidung FOR INSERT WITH CHECK (auth_uid = auth.uid());
DROP POLICY IF EXISTS "nguoidung_update" ON public.nguoidung;
CREATE POLICY "nguoidung_update" ON public.nguoidung FOR UPDATE USING (auth_uid = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "nguoidung_delete" ON public.nguoidung;
CREATE POLICY "nguoidung_delete" ON public.nguoidung FOR DELETE USING (auth_uid = auth.uid() OR public.is_admin());

-- 3.2. hogiadinh
DROP POLICY IF EXISTS "hogiadinh_select" ON public.hogiadinh;
CREATE POLICY "hogiadinh_select" ON public.hogiadinh FOR SELECT USING (id_chuho = public.current_user_id() OR public.is_household_member(id_hogiadinh) OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_insert" ON public.hogiadinh;
CREATE POLICY "hogiadinh_insert" ON public.hogiadinh FOR INSERT WITH CHECK (id_chuho = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_update" ON public.hogiadinh;
CREATE POLICY "hogiadinh_update" ON public.hogiadinh FOR UPDATE USING (id_chuho = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "hogiadinh_delete" ON public.hogiadinh;
CREATE POLICY "hogiadinh_delete" ON public.hogiadinh FOR DELETE USING (id_chuho = public.current_user_id() OR public.is_admin());

-- 3.3. thanhvien_hogiadinh
DROP POLICY IF EXISTS "thanhvien_select" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_select" ON public.thanhvien_hogiadinh FOR SELECT USING (id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "thanhvien_insert" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_insert" ON public.thanhvien_hogiadinh FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "thanhvien_update" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_update" ON public.thanhvien_hogiadinh FOR UPDATE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "thanhvien_delete" ON public.thanhvien_hogiadinh;
CREATE POLICY "thanhvien_delete" ON public.thanhvien_hogiadinh FOR DELETE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());

-- 3.4. esp32_nodes
DROP POLICY IF EXISTS "esp32_nodes_select" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_select" ON public.esp32_nodes FOR SELECT USING (true);
DROP POLICY IF EXISTS "esp32_nodes_insert" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_insert" ON public.esp32_nodes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "esp32_nodes_update" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_update" ON public.esp32_nodes FOR UPDATE USING (idnguoidung = public.current_user_id() OR public.is_admin() OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id() AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control')) OR (idnguoidung IS NULL AND public.current_user_id() IS NOT NULL) OR auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "esp32_nodes_delete" ON public.esp32_nodes;
CREATE POLICY "esp32_nodes_delete" ON public.esp32_nodes FOR DELETE USING (idnguoidung = public.current_user_id() OR public.is_admin());

-- 3.5. thietbi
DROP POLICY IF EXISTS "thietbi_select" ON public.thietbi;
CREATE POLICY "thietbi_select" ON public.thietbi FOR SELECT USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "thietbi_insert" ON public.thietbi;
CREATE POLICY "thietbi_insert" ON public.thietbi FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "thietbi_update" ON public.thietbi;
CREATE POLICY "thietbi_update" ON public.thietbi FOR UPDATE USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE idnguoidung = public.current_user_id() OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id() AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());
DROP POLICY IF EXISTS "thietbi_delete" ON public.thietbi;
CREATE POLICY "thietbi_delete" ON public.thietbi FOR DELETE USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE idnguoidung = public.current_user_id() OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id() AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());

-- 3.6. dulieucambien
DROP POLICY IF EXISTS "dulieucambien_select" ON public.dulieucambien;
CREATE POLICY "dulieucambien_select" ON public.dulieucambien FOR SELECT USING (cambien_idnode IS NULL OR cambien_idnode IN (SELECT idnode FROM public.esp32_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "dulieucambien_insert" ON public.dulieucambien;
CREATE POLICY "dulieucambien_insert" ON public.dulieucambien FOR INSERT WITH CHECK (true);

-- 3.7. luat
DROP POLICY IF EXISTS "luat_select" ON public.luat;
CREATE POLICY "luat_select" ON public.luat FOR SELECT USING (id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t JOIN public.esp32_nodes n ON n.idnode = t.idnode WHERE n.id_hogiadinh = ANY(public.user_household_ids()) OR n.idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "luat_insert" ON public.luat;
CREATE POLICY "luat_insert" ON public.luat FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "luat_update" ON public.luat;
CREATE POLICY "luat_update" ON public.luat FOR UPDATE USING (id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t JOIN public.esp32_nodes n ON n.idnode = t.idnode WHERE n.idnguoidung = public.current_user_id() OR (n.id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id() AND id_hogiadinh = n.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());
DROP POLICY IF EXISTS "luat_delete" ON public.luat;
CREATE POLICY "luat_delete" ON public.luat FOR DELETE USING (id_thietbi IN (SELECT t.id_thietbi FROM public.thietbi t JOIN public.esp32_nodes n ON n.idnode = t.idnode WHERE n.idnguoidung = public.current_user_id() OR (n.id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id() AND id_hogiadinh = n.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());

-- 3.8. lichhengio
DROP POLICY IF EXISTS "lichhengio_select" ON public.lichhengio;
CREATE POLICY "lichhengio_select" ON public.lichhengio FOR SELECT USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "lichhengio_insert" ON public.lichhengio;
CREATE POLICY "lichhengio_insert" ON public.lichhengio FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "lichhengio_update" ON public.lichhengio;
CREATE POLICY "lichhengio_update" ON public.lichhengio FOR UPDATE USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE idnguoidung = public.current_user_id() OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id() AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());
DROP POLICY IF EXISTS "lichhengio_delete" ON public.lichhengio;
CREATE POLICY "lichhengio_delete" ON public.lichhengio FOR DELETE USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE idnguoidung = public.current_user_id() OR (id_hogiadinh = ANY(public.user_household_ids()) AND EXISTS (SELECT 1 FROM public.thanhvien_hogiadinh WHERE idnguoidung = public.current_user_id() AND id_hogiadinh = public.esp32_nodes.id_hogiadinh AND quyen_dieu_khien = 'full_control'))) OR public.is_admin());

-- 3.9. nhatkyhoatdong
DROP POLICY IF EXISTS "nhatkyhoatdong_select" ON public.nhatkyhoatdong;
CREATE POLICY "nhatkyhoatdong_select" ON public.nhatkyhoatdong FOR SELECT USING ((idnguoidung = public.current_user_id() AND loai_thongbao IN ('user_action', 'system_alert', 'admin_notification', 'user_to_admin')) OR (idnguoidung IS NULL AND loai_thongbao IN ('system_alert', 'admin_notification')) OR public.is_admin() OR idnode IN (SELECT idnode FROM public.esp32_nodes WHERE id_hogiadinh = ANY(public.user_household_ids())));
DROP POLICY IF EXISTS "nhatkyhoatdong_insert" ON public.nhatkyhoatdong;
CREATE POLICY "nhatkyhoatdong_insert" ON public.nhatkyhoatdong FOR INSERT WITH CHECK (true);

-- 3.10. canh_bao_ky_thuat
DROP POLICY IF EXISTS "canh_bao_ky_thuat_select" ON public.canh_bao_ky_thuat;
CREATE POLICY "canh_bao_ky_thuat_select" ON public.canh_bao_ky_thuat FOR SELECT USING (idnode IN (SELECT idnode FROM public.esp32_nodes WHERE id_hogiadinh = ANY(public.user_household_ids()) OR idnguoidung = public.current_user_id()) OR public.is_admin());
DROP POLICY IF EXISTS "canh_bao_ky_thuat_update" ON public.canh_bao_ky_thuat;
CREATE POLICY "canh_bao_ky_thuat_update" ON public.canh_bao_ky_thuat FOR UPDATE USING (public.is_admin());

-- 3.11. ho_tro_tickets
DROP POLICY IF EXISTS "ho_tro_tickets_select" ON public.ho_tro_tickets;
CREATE POLICY "ho_tro_tickets_select" ON public.ho_tro_tickets FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "ho_tro_tickets_insert" ON public.ho_tro_tickets;
CREATE POLICY "ho_tro_tickets_insert" ON public.ho_tro_tickets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "ho_tro_tickets_update" ON public.ho_tro_tickets;
CREATE POLICY "ho_tro_tickets_update" ON public.ho_tro_tickets FOR UPDATE USING (idnguoidung = public.current_user_id() OR public.is_admin());

-- 3.12. remote_access_consent, audit_log, blocked_nodes, ma_moi, business tables
DROP POLICY IF EXISTS "remote_access_consent_select" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_select" ON public.remote_access_consent FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "remote_access_consent_insert" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_insert" ON public.remote_access_consent FOR INSERT WITH CHECK (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "remote_access_consent_update" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_update" ON public.remote_access_consent FOR UPDATE USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "remote_access_consent_delete" ON public.remote_access_consent;
CREATE POLICY "remote_access_consent_delete" ON public.remote_access_consent FOR DELETE USING (idnguoidung = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "blocked_nodes_select" ON public.blocked_nodes;
CREATE POLICY "blocked_nodes_select" ON public.blocked_nodes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "blocked_nodes_insert" ON public.blocked_nodes;
CREATE POLICY "blocked_nodes_insert" ON public.blocked_nodes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "blocked_nodes_delete" ON public.blocked_nodes;
CREATE POLICY "blocked_nodes_delete" ON public.blocked_nodes FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ma_moi_select" ON public.ma_moi;
CREATE POLICY "ma_moi_select" ON public.ma_moi FOR SELECT USING (true);
DROP POLICY IF EXISTS "ma_moi_insert" ON public.ma_moi;
CREATE POLICY "ma_moi_insert" ON public.ma_moi FOR INSERT WITH CHECK (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "ma_moi_update" ON public.ma_moi;
CREATE POLICY "ma_moi_update" ON public.ma_moi FOR UPDATE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());
DROP POLICY IF EXISTS "ma_moi_delete" ON public.ma_moi;
CREATE POLICY "ma_moi_delete" ON public.ma_moi FOR DELETE USING (id_hogiadinh = ANY(public.user_household_ids()) OR public.is_admin());

DROP POLICY IF EXISTS "goi_dich_vu_select" ON public.goi_dich_vu;
CREATE POLICY "goi_dich_vu_select" ON public.goi_dich_vu FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "dang_ky_thue_bao_select" ON public.dang_ky_thue_bao;
CREATE POLICY "dang_ky_thue_bao_select" ON public.dang_ky_thue_bao FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "giao_dich_kinh_doanh_select" ON public.giao_dich_kinh_doanh;
CREATE POLICY "giao_dich_kinh_doanh_select" ON public.giao_dich_kinh_doanh FOR SELECT USING (idnguoidung = public.current_user_id() OR public.is_admin());
DROP POLICY IF EXISTS "chi_phi_van_hanh_select" ON public.chi_phi_van_hanh;
CREATE POLICY "chi_phi_van_hanh_select" ON public.chi_phi_van_hanh FOR SELECT USING (auth.role() = 'authenticated');
