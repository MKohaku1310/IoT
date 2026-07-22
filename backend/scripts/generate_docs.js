/**
 * Script tạo file DOCX: Hướng dẫn Test Backend & Frontend
 * Chạy: node scripts/generate_docs.js (chạy từ thư mục backend)
 * Output: ../../docs/TEST_COMMANDS.docx
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  convertInchesToTwip,
  PageBreak,
  UnderlineType,
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Màu sắc ────────────────────────────────────────────────────────────────
const COLORS = {
  primary:    '1e40af', // Blue-800
  secondary:  '0f766e', // Teal-700
  accent:     '7c3aed', // Violet-700
  success:    '15803d', // Green-700
  warning:    'b45309', // Amber-700
  danger:     'b91c1c', // Red-700
  codeBg:     'f1f5f9', // Slate-100
  headerBg:   '1e3a5f', // Dark Blue
  rowAlt:     'e8f0fe', // Light Blue
  white:      'FFFFFF',
  darkText:   '1e293b',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    run: { color: COLORS.headerBg, bold: true, size: 36 },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    run: { color: COLORS.primary, bold: true, size: 28 },
  });
}

function heading3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
    run: { color: COLORS.secondary, bold: true, size: 24 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({
      text,
      size: 22,
      color: opts.color || COLORS.darkText,
      bold: opts.bold || false,
      italics: opts.italic || false,
    })],
    spacing: { before: 80, after: 80 },
    alignment: opts.align || AlignmentType.LEFT,
  });
}

function codeBlock(lines) {
  return lines.map(line =>
    new Paragraph({
      children: [new TextRun({
        text: line,
        font: 'Courier New',
        size: 19,
        color: '1e293b',
      })],
      shading: { type: ShadingType.SOLID, color: COLORS.codeBg, fill: COLORS.codeBg },
      spacing: { before: 0, after: 0 },
      indent: { left: convertInchesToTwip(0.2) },
    })
  );
}

function codeComment(text) {
  return new Paragraph({
    children: [new TextRun({
      text,
      font: 'Courier New',
      size: 19,
      color: '059669',
      italics: true,
    })],
    shading: { type: ShadingType.SOLID, color: COLORS.codeBg, fill: COLORS.codeBg },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2) },
  });
}

function spacer() {
  return new Paragraph({ text: '', spacing: { before: 80, after: 80 } });
}

function divider() {
  return new Paragraph({
    text: '─'.repeat(70),
    run: { color: 'cbd5e1', size: 16 },
    spacing: { before: 120, after: 120 },
  });
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((cell, i) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: String(cell),
            bold: isHeader,
            color: isHeader ? COLORS.white : COLORS.darkText,
            size: isHeader ? 20 : 19,
            font: 'Segoe UI',
          })],
          alignment: AlignmentType.LEFT,
          spacing: { before: 80, after: 80 },
        })],
        shading: isHeader
          ? { type: ShadingType.SOLID, color: COLORS.headerBg, fill: COLORS.headerBg }
          : { type: ShadingType.SOLID, color: i === 0 ? COLORS.rowAlt : COLORS.white, fill: i === 0 ? COLORS.rowAlt : COLORS.white },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e1' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e1' },
          left:   { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e1' },
          right:  { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e1' },
        },
      })
    ),
  });
}

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r, false)),
    ],
    columnWidths: colWidths,
  });
}

function labeledCode(label, lines, comment) {
  return [
    para(`► ${label}`, { bold: true, color: COLORS.primary }),
    ...(comment ? [codeComment(`# ${comment}`)] : []),
    ...codeBlock(lines),
    spacer(),
  ];
}

// ─── NỘI DUNG CHÍNH ──────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Segoe UI', size: 22, color: COLORS.darkText },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top:    convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left:   convertInchesToTwip(1.2),
          right:  convertInchesToTwip(1.2),
        },
      },
    },
    children: [

      // ════════════════════════════════════════════
      // TRANG BÌA
      // ════════════════════════════════════════════
      new Paragraph({
        children: [new TextRun({ text: '🏠 Smart Home IoT', bold: true, size: 56, color: COLORS.headerBg, font: 'Segoe UI' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Hướng Dẫn Test Backend & Frontend', bold: true, size: 36, color: COLORS.primary, font: 'Segoe UI' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'ESP32 · MQTT · Supabase · React · Vercel · Render', size: 24, color: '64748b', italics: true, font: 'Segoe UI' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 1000 },
      }),
      para('Tài liệu này tổng hợp đầy đủ các lệnh để cài đặt, chạy, kiểm tra và debug toàn bộ hệ thống Smart Home IoT từ backend đến frontend.', { align: AlignmentType.CENTER }),
      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════
      // 1. TỔNG QUAN HỆ THỐNG
      // ════════════════════════════════════════════
      heading1('1. Tổng Quan Hệ Thống'),
      para('Kiến trúc hệ thống gồm 3 thành phần chính:'),
      spacer(),
      makeTable(
        ['Thành phần', 'Công nghệ', 'Vai trò', 'Deploy'],
        [
          ['ESP32-S3', 'C++, Arduino', 'Đọc cảm biến, điều khiển LED', 'Phần cứng thật'],
          ['Backend Bridge', 'Node.js, MQTT', 'Cầu nối MQTT ↔ Supabase', 'Render.com'],
          ['Frontend Dashboard', 'React, TypeScript', 'Giao diện giám sát & điều khiển', 'Vercel.com'],
        ],
        [3000, 3000, 4000, 3000]
      ),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 2. YÊU CẦU TIÊN QUYẾT
      // ════════════════════════════════════════════
      heading1('2. Yêu Cầu Tiên Quyết'),
      spacer(),
      makeTable(
        ['Phần mềm', 'Phiên bản tối thiểu', 'Link tải'],
        [
          ['Node.js', '>= 20.x LTS', 'https://nodejs.org'],
          ['npm', '>= 10.x', 'Đi kèm Node.js'],
          ['Git', 'Latest', 'https://git-scm.com'],
          ['Arduino IDE', '>= 2.0', 'https://www.arduino.cc/en/software'],
          ['Vercel CLI (optional)', 'Latest', 'npm install -g vercel'],
        ],
        [3000, 3000, 7000]
      ),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 3. CÀI ĐẶT
      // ════════════════════════════════════════════
      heading1('3. Cài Đặt'),

      heading2('3.1 Clone Repository'),
      ...labeledCode('Clone và vào thư mục project', [
        'git clone <URL_REPOSITORY>',
        'cd IoT-PJ1',
      ]),

      heading2('3.2 Cài đặt Backend'),
      ...labeledCode('Vào thư mục backend và cài dependencies', [
        'cd backend',
        'npm install',
      ]),
      para('Tạo file .env trong thư mục backend/:'),
      ...codeBlock([
        '# Supabase Configuration',
        'SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY',
        '',
        '# MQTT Broker',
        'MQTT_BROKER_URL=mqtt://broker.hivemq.com',
        'MQTT_PORT=1883',
        '',
        '# Self-ping URL (chỉ cần khi deploy Render)',
        'RENDER_EXTERNAL_URL=https://YOUR_SERVICE.onrender.com',
      ]),
      spacer(),

      heading2('3.3 Cài đặt Frontend'),
      ...labeledCode('Vào thư mục frontend và cài dependencies', [
        'cd ../frontend',
        'npm install',
      ]),
      para('Tạo file .env trong thư mục frontend/:'),
      ...codeBlock([
        '# Supabase (dùng Anon/Public Key, KHÔNG phải Service Role Key)',
        'VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co',
        'VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY',
      ]),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 4. CHẠY LOCAL
      // ════════════════════════════════════════════
      heading1('4. Chạy Local (Development)'),

      heading2('4.1 Khởi động Backend Bridge'),
      ...labeledCode('Chạy development mode (auto-restart)', [
        'cd backend',
        'npm run dev',
      ], 'Dùng nodemon, tự restart khi sửa code'),
      ...labeledCode('Chạy production mode', [
        'cd backend',
        'npm start',
        '# hoặc: node bridge.js',
      ]),
      para('Output mong đợi khi thành công:'),
      ...codeBlock([
        '[INFO]    --- KHỞI ĐỘNG HỆ THỐNG SMART HOME BRIDGE ---',
        '[SUCCESS] Đã kết nối kênh Realtime bảng "thietbi": trạng thái = SUBSCRIBED',
        '[SUCCESS] Đã kết nối kênh Realtime bảng "luat": trạng thái = SUBSCRIBED',
        '[SUCCESS] Kết nối thành công đến MQTT Broker!',
        '[INFO]    Đã subscribe thành công các topic: [...]',
      ]),
      spacer(),

      heading2('4.2 Khởi động Frontend Dev Server'),
      ...labeledCode('Khởi động Vite dev server', [
        'cd frontend',
        'npm run dev',
      ]),
      para('Mở trình duyệt tại: http://localhost:3000'),
      spacer(),

      heading2('4.3 Chạy Simulator (không có ESP32 thật)'),
      ...labeledCode('Giả lập ESP32 gửi dữ liệu MQTT mỗi 20 giây', [
        'cd backend',
        'node scripts/simulator.js',
      ]),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 5. TEST BACKEND
      // ════════════════════════════════════════════
      heading1('5. Test Backend'),

      heading2('5.1 Kiểm tra Health Check Server'),
      ...labeledCode('Kiểm tra backend local đang chạy', [
        '# PowerShell',
        'Invoke-RestMethod -Uri "http://localhost:10000/health"',
        '',
        '# CMD / curl',
        'curl http://localhost:10000/health',
      ]),
      para('Response mong đợi:'),
      ...codeBlock([
        '{',
        '  "status": "ok",',
        '  "service": "Smart Home IoT Bridge",',
        '  "uptime_seconds": 120,',
        '  "mqtt_connected": true,',
        '  "timestamp": "2026-07-09T07:00:00.000Z"',
        '}',
      ]),
      spacer(),

      heading2('5.2 Test Kết Nối Supabase (Đọc dữ liệu)'),
      ...labeledCode('Kiểm tra dữ liệu cảm biến mới nhất trong DB', [
        'node -e "',
        "const { createClient } = require('@supabase/supabase-js');",
        "const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);",
        "sb.from('dulieucambien').select('*').order('thoigian',{ascending:false}).limit(5)",
        "  .then(r => console.log(JSON.stringify(r.data, null, 2)));",
        '"',
      ], 'Chạy từ thư mục backend/ (đã có .env)'),
      spacer(),

      heading2('5.3 Test Supabase Realtime (Lắng nghe thay đổi)'),
      ...labeledCode('Lắng nghe sự kiện UPDATE bảng thietbi trong 30 giây', [
        'node -e "',
        "const { createClient } = require('@supabase/supabase-js');",
        "const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);",
        "sb.channel('test').on('postgres_changes',",
        "  { event: 'UPDATE', schema: 'public', table: 'thietbi' },",
        "  p => console.log('EVENT:', p.new)",
        ").subscribe(s => console.log('Status:', s));",
        "setTimeout(() => process.exit(0), 30000);",
        '"',
      ], 'Sau đó vào Web và bật/tắt thiết bị để kiểm tra'),
      spacer(),

      heading2('5.4 Test Ghi Dữ Liệu Cảm Biến (Insert)'),
      ...labeledCode('Chèn 1 bản ghi cảm biến giả vào database', [
        'node -e "',
        "const { createClient } = require('@supabase/supabase-js');",
        "const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);",
        "sb.from('dulieucambien').insert([{nhietdo:28.5,doam:70.2,anhsang:350,cambien:'TEST'}])",
        "  .select().then(r => console.log('Inserted:', r.data));",
        '"',
      ]),
      spacer(),

      heading2('5.5 Test Cập Nhật Trạng Thái Thiết Bị'),
      ...labeledCode('Bật Đèn (loai_thietbi=den, trangthai=1)', [
        'node -e "',
        "const { createClient } = require('@supabase/supabase-js');",
        "const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);",
        "sb.from('thietbi').update({trangthai:1}).eq('loai_thietbi','den').select()",
        "  .then(r => console.log('Updated:', r.data));",
        '"',
      ]),
      spacer(),

      heading2('5.6 Test MQTT Subscribe (Nhận tin nhắn)'),
      ...labeledCode('Lắng nghe toàn bộ topic của project', [
        'node -e "',
        "const mqtt = require('mqtt');",
        "const c = mqtt.connect('mqtt://broker.hivemq.com');",
        "c.on('connect', () => {",
        "  c.subscribe('buivansang_iot_pj/#');",
        "  console.log('Subscribed! Waiting for messages...');",
        "});",
        "c.on('message', (t,p) => console.log(`[${t}]`, p.toString()));",
        "setTimeout(() => process.exit(0), 30000);",
        '"',
      ], 'Theo dõi mọi tin nhắn trong 30 giây'),
      spacer(),

      heading2('5.7 Test MQTT Publish (Gửi lệnh điều khiển)'),
      ...labeledCode('Gửi lệnh BẬT Đèn (LED3)', [
        'node -e "',
        "const mqtt = require('mqtt');",
        "const c = mqtt.connect('mqtt://broker.hivemq.com');",
        "c.on('connect', () => {",
        "  c.publish('buivansang_iot_pj/led3', 'ON', {qos:1});",
        "  console.log('Published ON to led3');",
        "  setTimeout(() => process.exit(0), 2000);",
        "});",
        '"',
      ]),
      ...labeledCode('Gửi lệnh TẮT Đèn (LED3)', [
        'node -e "',
        "const mqtt = require('mqtt');",
        "const c = mqtt.connect('mqtt://broker.hivemq.com');",
        "c.on('connect', () => {",
        "  c.publish('buivansang_iot_pj/led3', 'OFF', {qos:1});",
        "  console.log('Published OFF to led3');",
        "  setTimeout(() => process.exit(0), 2000);",
        "});",
        '"',
      ]),
      ...labeledCode('Cập nhật ngưỡng nhiệt độ lên 32°C', [
        'node -e "',
        "const mqtt = require('mqtt');",
        "const c = mqtt.connect('mqtt://broker.hivemq.com');",
        "c.on('connect', () => {",
        "  c.publish('buivansang_iot_pj/threshold/temp', '32', {qos:1,retain:true});",
        "  console.log('Threshold updated to 32');",
        "  setTimeout(() => process.exit(0), 2000);",
        "});",
        '"',
      ]),
      spacer(),

      heading2('5.8 Kiểm tra tiến trình Node.js đang chạy'),
      ...labeledCode('Xem các process node.exe', [
        '# PowerShell',
        'Get-CimInstance Win32_Process -Filter "Name = \'node.exe\'" | Select-Object CommandLine',
        '',
        '# CMD',
        'tasklist | findstr node',
      ]),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 6. TEST FRONTEND
      // ════════════════════════════════════════════
      heading1('6. Test Frontend'),

      heading2('6.1 Build & Kiểm tra TypeScript'),
      ...labeledCode('Type-check toàn bộ project (không build)', [
        'cd frontend',
        'npx tsc --noEmit',
      ], 'Không có output = không có lỗi TypeScript'),
      ...labeledCode('Build production bundle', [
        'cd frontend',
        'npm run build',
      ]),
      spacer(),

      heading2('6.2 Lint Code'),
      ...labeledCode('Chạy ESLint kiểm tra code quality', [
        'cd frontend',
        'npm run lint',
      ]),
      spacer(),

      heading2('6.3 Preview Production Build'),
      ...labeledCode('Chạy server preview build (giống Vercel)', [
        'cd frontend',
        'npm run build',
        'npm run preview',
      ]),
      para('Mở trình duyệt tại: http://localhost:4173'),
      spacer(),

      heading2('6.4 Kiểm tra kết nối Supabase từ Frontend'),
      para('Mở DevTools (F12) → Console và chạy lệnh sau:'),
      ...codeBlock([
        '// Test đọc dữ liệu với Anon Key (giống frontend)',
        "const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');",
        "const sb = createClient(",
        "  'https://ccvesdhnzlvfpdfhlesr.supabase.co',",
        "  'sb_publishable_j72Mv19uraSeb0azL_ifHw_BAXSkPeU'",
        ");",
        "const r = await sb.from('dulieucambien').select('*').limit(3);",
        "console.log(r.data);",
      ]),
      spacer(),

      heading2('6.5 Kiểm tra MQTT WebSocket từ Browser Console'),
      para('Mở DevTools → Console và chạy:'),
      ...codeBlock([
        '// Kiểm tra kết nối MQTT WebSocket',
        "import('/src/lib/mqttClient.ts').then(m => {",
        '  console.log("MQTT connected:", m.isMqttConnected());',
        '});',
        '',
        '// Hoặc kiểm tra trong Console sau khi app load:',
        '// Bật/tắt thiết bị và quan sát log:',
        '// [MQTT] ✅ Đã kết nối WebSocket tới HiveMQ broker.',
        '// [MQTT] ✉️ Đã publish: buivansang_iot_pj/led3 = "ON" (QoS 0)',
      ]),
      spacer(),

      heading2('6.6 Test Deploy Vercel'),
      ...labeledCode('Deploy lên Vercel qua CLI', [
        'cd frontend',
        'npx vercel --prod',
      ]),
      ...labeledCode('Kiểm tra Vercel deployment status', [
        'npx vercel ls',
        'npx vercel inspect <deployment-url>',
      ]),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 7. TEST DATABASE (SQL)
      // ════════════════════════════════════════════
      heading1('7. Kiểm Tra Database (SQL Editor Supabase)'),
      para('Truy cập: Supabase Dashboard → SQL Editor và chạy các truy vấn sau:'),
      spacer(),

      heading2('7.1 Xem dữ liệu cảm biến mới nhất'),
      ...codeBlock([
        'SELECT iddl, thoigian, nhietdo, doam, anhsang, cambien',
        'FROM dulieucambien',
        'ORDER BY thoigian DESC',
        'LIMIT 20;',
      ]),
      spacer(),

      heading2('7.2 Đếm tổng số bản ghi cảm biến'),
      ...codeBlock([
        'SELECT COUNT(*) as total FROM dulieucambien;',
      ]),
      spacer(),

      heading2('7.3 Xem trạng thái các thiết bị'),
      ...codeBlock([
        'SELECT id_thietbi, loai_thietbi, ten_hienthi, trangthai,',
        "       CASE trangthai WHEN 1 THEN 'BẬT' ELSE 'TẮT' END AS trang_thai_text",
        'FROM thietbi',
        'ORDER BY id_thietbi;',
      ]),
      spacer(),

      heading2('7.4 Xem cấu hình luật tự động hóa'),
      ...codeBlock([
        'SELECT l.idluat, t.ten_hienthi, l.loaicambien, l.toantu,',
        '       l.nguong, l.automation',
        'FROM luat l',
        'JOIN thietbi t ON t.id_thietbi = l.id_thietbi',
        'ORDER BY l.idluat;',
      ]),
      spacer(),

      heading2('7.5 Xem nhật ký hoạt động 24h gần nhất'),
      ...codeBlock([
        'SELECT nk.idnhatky, t.ten_hienthi, nk.hanhdong,',
        "       to_char(nk.thoigian AT TIME ZONE 'Asia/Ho_Chi_Minh',",
        "               'DD/MM/YYYY HH24:MI:SS') as thoi_gian_vn",
        'FROM nhatkyhoatdong nk',
        'LEFT JOIN thietbi t ON t.id_thietbi = nk.id_thietbi',
        "WHERE nk.thoigian > NOW() - INTERVAL '24 hours'",
        'ORDER BY nk.thoigian DESC',
        'LIMIT 50;',
      ]),
      spacer(),

      heading2('7.6 Kiểm tra Realtime đã được bật'),
      ...codeBlock([
        "-- Kiểm tra bảng nào đã trong supabase_realtime publication",
        "SELECT * FROM pg_publication_tables",
        "WHERE pubname = 'supabase_realtime';",
      ]),
      spacer(),

      heading2('7.7 Dọn dẹp dữ liệu test'),
      ...codeBlock([
        '-- Xóa bản ghi cảm biến được tạo bằng lệnh TEST',
        "DELETE FROM dulieucambien WHERE cambien = 'TEST';",
        '',
        '-- Reset trạng thái tất cả thiết bị về TẮT',
        'UPDATE thietbi SET trangthai = 0;',
      ]),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 8. DEPLOY PRODUCTION
      // ════════════════════════════════════════════
      heading1('8. Deploy Production'),

      heading2('8.1 Backend → Render'),
      para('Cấu hình Render Web Service:'),
      spacer(),
      makeTable(
        ['Cài đặt', 'Giá trị'],
        [
          ['Root Directory', 'backend'],
          ['Build Command', 'npm install'],
          ['Start Command', 'node bridge.js'],
          ['Node Version', '20.x'],
        ],
        [5000, 8000]
      ),
      spacer(),
      para('Environment Variables trên Render:'),
      makeTable(
        ['Key', 'Value'],
        [
          ['SUPABASE_URL', 'https://YOUR_PROJECT.supabase.co'],
          ['SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_...'],
          ['RENDER_EXTERNAL_URL', 'https://YOUR_SERVICE.onrender.com'],
        ],
        [5000, 8000]
      ),
      spacer(),
      ...labeledCode('Kiểm tra backend Render đang hoạt động', [
        'curl https://YOUR_SERVICE.onrender.com/health',
        '',
        '# PowerShell:',
        'Invoke-RestMethod "https://YOUR_SERVICE.onrender.com/health"',
      ]),
      spacer(),

      heading2('8.2 Frontend → Vercel'),
      ...labeledCode('Build và deploy', [
        'cd frontend',
        'npm run build      # Kiểm tra build trước',
        'npx vercel --prod  # Deploy lên production',
      ]),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 9. TROUBLESHOOTING
      // ════════════════════════════════════════════
      heading1('9. Xử Lý Sự Cố'),
      spacer(),
      makeTable(
        ['Triệu chứng', 'Nguyên nhân', 'Cách khắc phục'],
        [
          ['Frontend không hiện dữ liệu', 'Backend Bridge chưa chạy', 'Chạy: cd backend && npm start'],
          ['Backend không nhận event từ Web', 'Supabase Realtime chưa bật', 'Chạy lại database/schema.sql phần ALTER PUBLICATION'],
          ['ESP32 không nhận lệnh từ Web', 'MQTT chưa kết nối / sai topic', 'Kiểm tra Serial Monitor, so sánh topic prefix'],
          ['Render tự ngủ sau 15 phút', 'Chưa cấu hình RENDER_EXTERNAL_URL', 'Thêm biến env RENDER_EXTERNAL_URL'],
          ['Vercel build lỗi TypeScript', 'Lỗi type trong code', 'Chạy: cd frontend && npx tsc --noEmit'],
          ['Lệnh điều khiển chậm', 'Đang qua Supabase Realtime', 'Đã fix: dùng MQTT WebSocket trực tiếp'],
        ],
        [3500, 3500, 6000]
      ),
      spacer(),
      divider(),

      // ════════════════════════════════════════════
      // 10. THAM KHẢO
      // ════════════════════════════════════════════
      heading1('10. Tham Khảo'),
      spacer(),
      makeTable(
        ['Tài nguyên', 'Link'],
        [
          ['Vercel Dashboard', 'https://vercel.com/dashboard'],
          ['Render Dashboard', 'https://dashboard.render.com'],
          ['Supabase Dashboard', 'https://supabase.com/dashboard'],
          ['HiveMQ Broker Status', 'https://status.hivemq.com'],
          ['Supabase JS Docs', 'https://supabase.com/docs/reference/javascript'],
          ['mqtt.js Docs', 'https://github.com/mqttjs/MQTT.js'],
          ['Live Demo URL', 'https://io-t-theta-olive.vercel.app'],
        ],
        [4000, 9000]
      ),

      spacer(),
      spacer(),
      new Paragraph({
        children: [new TextRun({
          text: `Tài liệu được tạo tự động ngày ${new Date().toLocaleDateString('vi-VN')} | Smart Home IoT — PTIT 2026`,
          size: 16, color: '94a3b8', italics: true, font: 'Segoe UI',
        })],
        alignment: AlignmentType.CENTER,
      }),
    ],
  }],
});

// ─── Xuất file ────────────────────────────────────────────────────────────────
const outputPath = path.resolve(__dirname, '../../docs/TEST_COMMANDS.docx');

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Đã tạo thành công: ${outputPath}`);
  console.log(`📄 Kích thước: ${(buffer.length / 1024).toFixed(1)} KB`);
});
