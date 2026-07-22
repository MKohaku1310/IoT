# Smart Home IoT — Database Architecture & Schema

Cấu trúc cơ sở dữ liệu dự án đã được mô-đun hóa thành **5 file SQL độc lập theo lớp kiến trúc**, giúp mã nguồn ngắn gọn, dễ đọc và dễ bảo trì:

```
database/
├── schema/
│   ├── 01_tables.sql            # [DDL] Khai báo 18 bảng cốt lõi & kinh doanh (3NF)
│   ├── 02_security_rls.sql      # [RLS] Helper functions & Row Level Security policies
│   ├── 03_rpc_functions.sql     # [RPC] Stored Procedures & API functions (Sensor trend, AI context, etc.)
│   ├── 04_indexes_triggers.sql  # [PERF] Triggers, Performance indexes & Realtime publication
│   └── 05_seed_data.sql         # [SEED] Dữ liệu mẫu khởi tạo (Nodes, Devices, Rules, Schedules)
├── migrations/                  # Các bản cập nhật migration theo thứ tự
│   ├── ...
│   └── 009_refactor_unified_schema_v6.sql
└── unified_schema.sql           # File tổng hợp 1-click dùng cho Supabase SQL Editor
```

---

## 🚀 Hướng Dẫn Sử Dụng

### Cách 1: Khởi Tạo Dự Án Mới trên Supabase (Khuyên Dùng)
Mở **Supabase SQL Editor** và chạy lần lượt 5 file trong thư mục `database/schema/` theo đúng thứ tự từ `01` đến `05`:
1. [01_tables.sql](file:///d:/PTIT/IT-VN%20Y3-1/IoT-UD/IoT-PJ1/database/schema/01_tables.sql)
2. [02_security_rls.sql](file:///d:/PTIT/IT-VN%20Y3-1/IoT-UD/IoT-PJ1/database/schema/02_security_rls.sql)
3. [03_rpc_functions.sql](file:///d:/PTIT/IT-VN%20Y3-1/IoT-UD/IoT-PJ1/database/schema/03_rpc_functions.sql)
4. [04_indexes_triggers.sql](file:///d:/PTIT/IT-VN%20Y3-1/IoT-UD/IoT-PJ1/database/schema/04_indexes_triggers.sql)
5. [05_seed_data.sql](file:///d:/PTIT/IT-VN%20Y3-1/IoT-UD/IoT-PJ1/database/schema/05_seed_data.sql)

*(Hoặc copy toàn bộ nội dung từ file tổng hợp [unified_schema.sql](file:///d:/PTIT/IT-VN%20Y3-1/IoT-UD/IoT-PJ1/database/unified_schema.sql) và dán vào Supabase SQL Editor để thi hành 1-click).*

---

### Cách 2: Nâng Cấp Database Hiện Tại mà Không Mất Dữ Liệu
Chạy duy nhất file migration:
- [009_refactor_unified_schema_v6.sql](file:///d:/PTIT/IT-VN%20Y3-1/IoT-UD/IoT-PJ1/database/migrations/009_refactor_unified_schema_v6.sql)
