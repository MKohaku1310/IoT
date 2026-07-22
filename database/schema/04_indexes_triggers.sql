-- ============================================================
-- 04_INDEXES_TRIGGERS.SQL — Performance Indexes & Triggers
-- Tối ưu chỉ mục và cấu hình Supabase Realtime Publication
-- ============================================================

-- 1. PERFORMANCE INDEXES
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

-- 2. TRIGGERS
-- 2.1. Tự động tạo profile nguoidung khi đăng ký Auth
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

-- 2.2. Tự động cập nhật thoigian_capnhat khi UPDATE thietbi
DROP FUNCTION IF EXISTS public.update_thietbi_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION public.update_thietbi_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.thoigian_capnhat = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_thietbi_updated ON public.thietbi;
CREATE TRIGGER trg_thietbi_updated
  BEFORE UPDATE ON public.thietbi
  FOR EACH ROW EXECUTE PROCEDURE public.update_thietbi_timestamp();

-- 3. SUPABASE REALTIME PUBLICATION
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
