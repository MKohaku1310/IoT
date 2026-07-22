import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Sparkles,
  Send,
  X,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Minimize2,
  Plus,
  AlertTriangle,
  Database,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { CITIES } from "./constants";
import {
  detectAnomalies,
  buildSmartSuggestions,
  parseUserIntent,
  fetchChatDataContext,
  buildDataContextPrompt,
  AnomalyAlert,
  SmartSuggestion,
} from "@/lib/aiDataService";

type Message = {
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
  isDataBacked?: boolean; // tin nhắn sử dụng dữ liệu thật từ DB
  suggestion?: Array<{
    device_id: number;
    device_name: string;
    action: "on" | "off";
    time: string;
    days: number[];
    reason: string;
  }>;
};

const CHAT_SESSIONS_KEY = "sh-chat-sessions";

interface ChatSession {
  chatId: string;
  title: string;
  nodeName: string;
  timestamp: string;
}

function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function saveChatMessages(chatId: string, messages: Message[]): void {
  try {
    const serialized = messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));
    window.localStorage.setItem(`sh-chat-messages-${chatId}`, JSON.stringify(serialized));
  } catch { }
}

function loadChatMessages(chatId: string): Message[] {
  try {
    const raw = window.localStorage.getItem(`sh-chat-messages-${chatId}`);
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    return parsed.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

function saveChatSession(session: ChatSession): void {
  try {
    const existing: ChatSession[] = JSON.parse(
      window.localStorage.getItem(CHAT_SESSIONS_KEY) || "[]"
    );
    const filtered = existing.filter((s) => s.chatId !== session.chatId);
    const updated = [session, ...filtered].slice(0, 50);
    window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updated));
  } catch { }
}

export function FloatingAIAssistant({
  sensors,
  devices,
  nodeName,
  currentUserId,
  nodeId,
  allNodes = [],
  gasPpm = 0,
}: {
  sensors: { temp: number | null; humid: number | null; light: number | null };
  devices: {
    ac: { on: boolean; mode: "auto" | "manual" };
    fan: { on: boolean; mode: "auto" | "manual" };
    light: { on: boolean; mode: "auto" | "manual" };
  };
  nodeName: string;
  currentUserId?: number | null;
  nodeId?: string;
  allNodes?: Array<{ idnode: string; ten_phong: string; loai_phong: string }>;
  gasPpm?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string>(() => generateChatId());
  const [chatTitle, setChatTitle] = useState<string>("");
  const [sessionLoggedRef_inner] = useState({ value: false });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // States cho Anomaly Detection
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);

  const defaultCity =
    typeof window !== "undefined"
      ? window.localStorage.getItem("sh-gemini-city") || CITIES[0].name
      : CITIES[0].name;

  // Chạy Anomaly Engine chủ động khi thay đổi sensor readings hoặc mở panel
  useEffect(() => {
    const runAnomalyEngine = async () => {
      const activeSensors = {
        temp: sensors.temp,
        humid: sensors.humid,
        light: sensors.light,
        gas: gasPpm || undefined,
      };
      const detected = await detectAnomalies(
        activeSensors,
        nodeId,
        nodeName,
        allNodes
      );
      setAnomalies(detected);

      // Tạo Smart Suggestions dựa trên context hiện tại và các cảnh báo tìm được
      const currentHour = new Date().getHours();
      const suggestions = buildSmartSuggestions(
        activeSensors,
        detected,
        nodeName,
        currentHour
      );
      setSmartSuggestions(suggestions);
    };

    runAnomalyEngine();
  }, [sensors.temp, sensors.humid, sensors.light, gasPpm, nodeId, nodeName, allNodes, isOpen]);

  // Khởi tạo tin nhắn chào mừng
  const buildWelcomeMessage = useCallback(
    (): Message => ({
      sender: "bot",
      text: `Xin chào! Tôi là Trợ lý AI Smart Home phiên bản nâng cấp. Tôi có thể phân tích dữ liệu lịch sử trong nhà, tự động cảnh báo bất thường và trả lời mọi thắc mắc của bạn từ dữ liệu thực tế của hộ gia đình (phòng hiện tại: ${nodeName}, Nhiệt độ: ${sensors.temp ?? "—"}°C, Độ ẩm: ${sensors.humid ?? "—"}%). Hãy hỏi tôi bất cứ điều gì!`,
      timestamp: new Date(),
    }),
    [nodeName, sensors.temp, sensors.humid]
  );

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([buildWelcomeMessage()]);
    }
  }, [nodeName, defaultCity, buildWelcomeMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (messages.length > 1 && chatId) {
      saveChatMessages(chatId, messages);
    }
  }, [messages, chatId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ chatId: string; title: string }>).detail;
      if (!detail?.chatId) return;
      const loaded = loadChatMessages(detail.chatId);
      if (loaded.length > 0) {
        setChatId(detail.chatId);
        setChatTitle(detail.title || "");
        sessionLoggedRef_inner.value = true;
        setMessages(loaded);
      }
      setIsOpen(true);
    };
    window.addEventListener("open-ai-chat", handler);
    return () => window.removeEventListener("open-ai-chat", handler);
  }, []);

  const logChatSession = useCallback(
    async (title: string, cid: string) => {
      try {
        const payload = JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "ai_chat",
          description: "Trò chuyện với Trợ lý AI nâng cấp",
          chat_title: title,
          chat_id: cid,
          node_id: nodeId || "",
          node_name: nodeName,
          timestamp: new Date().toISOString(),
        });
        await supabase.from("nhatkyhoatdong").insert([
          {
            idnguoidung: currentUserId ?? null,
            idnode: nodeId || null,
            loai_thongbao: 'user_action',
            hanhdong: payload,
          },
        ]);
        saveChatSession({ chatId: cid, title, nodeName, timestamp: new Date().toISOString() });
      } catch (err) {
        console.warn("Lỗi ghi log chat AI:", err);
      }
    },
    [currentUserId, nodeId, nodeName]
  );

  const handleNewChat = () => {
    const newId = generateChatId();
    setChatId(newId);
    setChatTitle("");
    sessionLoggedRef_inner.value = false;
    setMessages([buildWelcomeMessage()]);
    setInput("");
  };

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || input.trim();
    if (!promptText && !customPrompt) return;

    const userMessage: Message = { sender: "user", text: promptText, timestamp: new Date() };

    if (!customPrompt) {
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
    } else {
      setMessages((prev) => [...prev, { sender: "user", text: promptText, timestamp: new Date() }]);
    }

    setLoading(true);

    if (!sessionLoggedRef_inner.value) {
      const title = promptText.length > 40 ? promptText.slice(0, 40) + "…" : promptText;
      setChatTitle(title);
      sessionLoggedRef_inner.value = true;
      void logChatSession(title, chatId);
    }

    let isDataAware = false;

    try {
      const rawKey =
        import.meta.env.VITE_GEMINI_API_KEY ||
        (typeof window !== "undefined" ? window.localStorage.getItem("sh-gemini-key") : null);
      const apiKey = rawKey ? rawKey.trim().replace(/[^a-zA-Z0-9._-]/g, "") : null;
      if (!apiKey) {
        throw new Error(
          "Vui lòng cấu hình API Key Gemini trong Cài đặt hệ thống (Admin) hoặc trong file cấu hình!"
        );
      }

      // --- 1 & 2. Truy vấn dữ liệu DB & Thời tiết ngoài trời song song ---
      const intent = parseUserIntent(promptText, allNodes);
      const targetNodeId = intent.nodeId || nodeId || null;

      const fetchWeather = async (): Promise<string> => {
        try {
          const c = CITIES.find((x) => x.name === defaultCity) || CITIES[0];
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability&timezone=Asia%2FBangkok`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            const nextHoursTemp = wData.hourly?.temperature_2m?.slice(0, 6) || [];
            const nextHoursRain = wData.hourly?.precipitation_probability?.slice(0, 6) || [];
            return `Nhiệt độ ngoài trời tại ${defaultCity}: ${wData.current?.temperature_2m}°C, độ ẩm: ${wData.current?.relative_humidity_2m}%. Dự báo các giờ tới nhiệt độ từ ${Math.min(...nextHoursTemp)}°C đến ${Math.max(...nextHoursTemp)}°C. Khả năng mưa cao nhất: ${Math.max(...nextHoursRain)}%.`;
          }
        } catch (err) {
          console.warn("Lỗi/Timeout API thời tiết ngoài trời:", err);
        }
        return "Không thể lấy thông số thời tiết ngoài trời.";
      };

      const [databaseContext, weatherInfo] = await Promise.all([
        fetchChatDataContext(intent.timeRange, targetNodeId)
          .then((chatData) => {
            isDataAware = true;
            return buildDataContextPrompt(chatData, intent);
          })
          .catch((dbErr) => {
            console.warn("Không lấy được dữ liệu ngữ cảnh từ DB:", dbErr);
            return "";
          }),
        fetchWeather(),
      ]);

      // --- 3. Tạo system prompt ---
      const systemContext = `Bạn là Trợ lý AI Nhà thông minh (Smart Home AI Assistant) nâng cấp.
Nhiệm vụ của bạn là hỗ trợ chủ nhà giám sát cảm biến, phân tích hành vi và trả lời câu hỏi bằng cách sử dụng DỮ LIỆU THẬT có trong cơ sở dữ liệu.

Phòng hiện tại đang theo dõi trực tiếp: ${nodeName}
- Cảm biến trực tiếp: Nhiệt độ ${sensors.temp ?? "—"}°C, Độ ẩm ${sensors.humid ?? "—"}%, Ánh sáng ${sensors.light ?? "—"} lx
- Cảm biến Gas hiện tại: ${gasPpm} ppm (nếu có)
- Trạng thái thiết bị hiện tại: Điều hòa (${devices.ac.on ? "BẬT" : "TẮT"}, chế độ: ${devices.ac.mode}), Quạt (${devices.fan.on ? "BẬT" : "TẮT"}, chế độ: ${devices.fan.mode}), Đèn (${devices.light.on ? "BẬT" : "TẮT"}, chế độ: ${devices.light.mode})

Thông tin thời tiết ngoài trời:
${weatherInfo}

${databaseContext}

YÊU CẦU ĐẶC BIỆT:
1. TRẢ LỜI CỰC KỲ NGẮN GỌN & SÚC TÍCH: Trả lời đi thẳng vào vấn đề, dùng tối đa 2 - 4 gạch đầu dòng ngắn gọn. Tuyệt đối không trả lời dài dòng, lan man hay chào hỏi khách khí thừa thãi.
2. DỮ LIỆU THẬT & CHÍNH XÁC: Trích dẫn số liệu cụ thể (nhiệt độ, độ ẩm, gas, thời gian) từ ngữ cảnh được cung cấp.
3. CẢNH BÁO BẤT THƯỜNG (nếu có): Nêu ngắn gọn nguyên nhân & hướng xử lý nếu phát hiện Gas hoặc nhiệt độ bất thường.
4. ĐỀ XUẤT HẸN GIỜ: Nếu cần hẹn giờ thiết bị, đính kèm danh sách mảng JSON cho một hoặc NHIỀU THIẾT BỊ ở cuối câu trả lời:
[SUGGESTION]
[
  {
    "device_id": 1,
    "device_name": "Điều hòa",
    "action": "on",
    "time": "14:30",
    "days": [1, 2, 3, 4, 5],
    "reason": "Nhiệt độ ngoài trời trưa nay dự báo đạt 34°C..."
  },
  {
    "device_id": 2,
    "device_name": "Quạt",
    "action": "off",
    "time": "15:00",
    "days": [1, 2, 3, 4, 5],
    "reason": "Tắt quạt sau khi phòng đã mát..."
  }
]
[/SUGGESTION]
(device_id: 1=Điều hòa, 2=Quạt, 3=Đèn)`;

      // --- 4. Gọi API Gemini với fallback & retry khi bị Rate Limit ---
      const TARGETS = [
        { ver: "v1beta", model: "gemini-2.5-flash" },
        { ver: "v1beta", model: "gemini-2.5-flash-lite" },
        { ver: "v1beta", model: "gemini-flash-latest" },
        { ver: "v1beta", model: "gemini-3.5-flash" },
        { ver: "v1beta", model: "gemini-2.0-flash-lite" },
      ];

      let geminiRes: Response | null = null;
      let lastError = "";
      let isQuotaExceeded = false;

      for (const target of TARGETS) {
        try {
          const url = `https://generativelanguage.googleapis.com/${target.ver}/models/${target.model}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemContext}\n\nTin nhắn của người dùng: "${promptText}"` }],
                },
              ],
            }),
          });

          if (res.ok) {
            geminiRes = res;
            break;
          } else {
            const err = await res.json().catch(() => ({}));
            lastError = err.error?.message || `HTTP ${res.status}`;
            if (res.status === 429 || lastError.toLowerCase().includes("quota")) {
              isQuotaExceeded = true;
              // Nghỉ 1.5s trước khi thử model tiếp theo nếu bị dính Rate Limit
              await new Promise((r) => setTimeout(r, 1500));
            }
          }
        } catch (e: any) {
          lastError = e.message || "Connection failed";
        }
      }

      if (!geminiRes) {
        if (isQuotaExceeded) {
          throw new Error(
            "Hạn ngạch API Gemini miễn phí tạm thời vượt quá giới hạn (Rate Limit 15 lượt/phút). Vui lòng thử lại sau vài giây hoặc cập nhật API Key mới tại trang Cài đặt!"
          );
        }
        throw new Error(`AI không khả dụng. Lỗi: ${lastError}`);
      }

      const gData = await geminiRes.json();
      let replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // 5. Bóc tách [SUGGESTION]
      let suggestionData: any[] | undefined = undefined;
      const suggestionMatch = replyText.match(/\[SUGGESTION\]([\s\S]*?)\[\/SUGGESTION\]/i);

      if (suggestionMatch) {
        try {
          const rawJson = suggestionMatch[1].trim();
          const parsed = JSON.parse(rawJson);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          if (list.length > 0) {
            suggestionData = list;
          }
          replyText = replyText.replace(/\[SUGGESTION\][\s\S]*?\[\/SUGGESTION\]/gi, "").trim();
        } catch (err) {
          console.warn("Lỗi phân tích JSON đề xuất từ AI:", err);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: replyText,
          timestamp: new Date(),
          isDataBacked: isDataAware,
          suggestion: suggestionData,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `❌ Lỗi: ${err.message || "Không thể kết nối đến Trợ lý AI. Vui lòng kiểm tra lại cấu hình."}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = async (suggItem: any | any[]) => {
    try {
      const items: any[] = Array.isArray(suggItem) ? suggItem : [suggItem];
      const currentNode = nodeId || allNodes[0]?.idnode || "ESP32";

      // 1. Truy vấn danh sách thiết bị thật của Node này để lấy id_thietbi chuẩn từ DB
      const { data: dbDevices } = await supabase
        .from("thietbi")
        .select("id_thietbi, loai_thietbi, ten_hienthi, idnode")
        .eq("idnode", currentNode);

      const records = items.map((sugg) => {
        // Tìm thiết bị phù hợp trong DB theo loại hoặc tên hiển thị
        let matchedDev = (dbDevices || []).find((d) => {
          const loai = (d.loai_thietbi || "").toLowerCase();
          const name = (d.ten_hienthi || "").toLowerCase();
          const sName = (sugg.device_name || "").toLowerCase();
          const sId = sugg.device_id;

          if (sId === 1 || sName.includes("điều hòa") || sName.includes("ac") || loai === "dieu_hoa") {
            return loai === "dieu_hoa" || name.includes("điều hòa");
          }
          if (sId === 2 || sName.includes("quạt") || sName.includes("fan") || loai === "quat") {
            return loai === "quat" || name.includes("quạt");
          }
          if (sId === 3 || sName.includes("đèn") || sName.includes("light") || loai === "den") {
            return loai === "den" || name.includes("đèn");
          }
          return false;
        });

        // Nếu không khớp chính xác, thử tìm theo loại thiết bị tương ứng
        if (!matchedDev && dbDevices && dbDevices.length > 0) {
          const sName = (sugg.device_name || "").toLowerCase();
          if (sName.includes("điều hòa") || sName.includes("ac")) {
            matchedDev = dbDevices.find((d) => d.loai_thietbi === "dieu_hoa");
          } else if (sName.includes("quạt") || sName.includes("fan")) {
            matchedDev = dbDevices.find((d) => d.loai_thietbi === "quat");
          } else if (sName.includes("đèn") || sName.includes("light")) {
            matchedDev = dbDevices.find((d) => d.loai_thietbi === "den");
          }
        }

        const realId = matchedDev ? matchedDev.id_thietbi : (typeof sugg.device_id === "number" && sugg.device_id > 10 ? sugg.device_id : (dbDevices?.[0]?.id_thietbi || 18));
        const cleanDays = (sugg.days || [0, 1, 2, 3, 4, 5, 6]).map((d: number) => (d === 7 ? 0 : d));

        return {
          id_thietbi: realId,
          hanhdong: sugg.action,
          thoigian: sugg.time.length === 5 ? sugg.time + ":00" : sugg.time,
          thu: cleanDays,
          kichhoat: true,
          idnode: currentNode,
        };
      });

      const { error } = await supabase.from("lichhengio").insert(records);
      if (error) throw error;

      for (const sugg of items) {
        await supabase.from("nhatkyhoatdong").insert([
          {
            idnguoidung: currentUserId ?? null,
            idnode: currentNode,
            loai_thongbao: 'user_action',
            hanhdong: JSON.stringify({
              loai_nhatky: "user_action",
              loai_thao_tac: "schedule_create",
              description: `Trợ lý AI thêm lịch hẹn giờ cho ${sugg.device_name} (${sugg.action === "on" ? "BẬT" : "TẮT"} lúc ${sugg.time})`,
              node_id: currentNode,
              node_name: nodeName,
              timestamp: new Date().toISOString(),
              meta_detail: { device_name: sugg.device_name, action: sugg.action, time: sugg.time, days: sugg.days },
            }),
          },
        ]);
      }

      const names = items.map((i) => i.device_name).join(", ");
      toast.success(`Đã tự động hẹn giờ cho ${names} thành công!`);
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi khi áp dụng lịch hẹn giờ!");
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Bạn có chắc muốn xóa lịch sử trò chuyện này không?")) {
      handleNewChat();
    }
  };

  const handleAnomalyClick = (anomaly: AnomalyAlert) => {
    if (anomaly.suggestedQuestion) {
      handleSend(undefined, anomaly.suggestedQuestion);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_8px_30px_-5px_rgba(99,102,241,0.5)] hover:shadow-[0_10px_40px_-5px_rgba(99,102,241,0.6)] hover:scale-105 transition-all duration-200 cursor-pointer"
        title="Trợ lý AI Smart Home"
      >
        {isOpen ? (
          <X className="h-6 w-6 animate-in fade-in zoom-in-50 duration-200" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6 animate-in fade-in duration-200" />
            {(anomalies.length > 0) ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white animate-bounce">
                {anomalies.length}
              </span>
            ) : (
              <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-pink-500" />
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-[380px] sm:max-w-[420px] h-[600px] flex flex-col rounded-3xl border border-white/60 bg-white/95 dark:border-white/10 dark:bg-slate-950/95 shadow-[0_15px_50px_-15px_rgba(79,70,229,0.3)] backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-900 bg-gradient-to-r from-indigo-500/10 to-purple-600/10">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Trợ lý AI Smart Home
                </h3>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {chatTitle ? (
                    <span className="truncate max-w-[180px]" title={chatTitle}>
                      {chatTitle}
                    </span>
                  ) : (
                    "Phân tích dữ liệu thực tế"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cuộc trò chuyện mới"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Xóa lịch sử"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Anomaly Alerts Proactive Banner */}
          {anomalies.length > 0 && (
            <div className="bg-rose-50 border-b border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5 animate-pulse" /> Phát hiện bất thường cần xử lý
              </div>
              <div className="space-y-1">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    onClick={() => handleAnomalyClick(anomaly)}
                    className="flex items-start justify-between bg-white/70 dark:bg-slate-900/50 p-2 rounded-xl border border-rose-100/50 dark:border-rose-900/25 hover:bg-white dark:hover:bg-slate-900 cursor-pointer transition-colors"
                  >
                    <div className="text-[10px] leading-relaxed text-slate-700 dark:text-slate-300 pr-2">
                      <span className="font-bold text-rose-600 dark:text-rose-400">{anomaly.title}: </span>
                      {anomaly.detail}
                    </div>
                    <ArrowRight className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={m.timestamp ? String(m.timestamp.getTime()) : idx}
                className={`flex gap-2.5 max-w-[85%] ${m.sender === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
              >
                {m.sender === "bot" && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className="space-y-2">
                  <div
                    className={`relative rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm font-medium ${m.sender === "user"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 rounded-tr-none"
                        : "bg-white/90 border border-slate-100 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 rounded-tl-none"
                      }`}
                  >
                    {m.text}

                    {m.sender === "bot" && m.isDataBacked && (
                      <div className="absolute -bottom-2 right-2.5 flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900 text-[8px] font-bold text-indigo-650 dark:text-indigo-400">
                        <Database className="h-2 w-2" /> Dữ liệu thực tế
                      </div>
                    )}
                  </div>

                  {/* Suggestions rendering */}
                  {m.suggestion && Array.isArray(m.suggestion) && m.suggestion.length > 0 && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/50 dark:border-purple-950/40 dark:bg-purple-950/10 p-3.5 space-y-3 shadow-sm max-w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                          <Sparkles className="h-3.5 w-3.5" /> Gợi ý hẹn giờ ({m.suggestion.length} thiết bị)
                        </div>
                        {m.suggestion.length > 1 && (
                          <button
                            onClick={() => handleApplySuggestion(m.suggestion)}
                            className="text-[10px] font-bold text-purple-600 dark:text-purple-300 hover:underline cursor-pointer"
                          >
                            Áp dụng tất cả
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {m.suggestion.map((sugg: any, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30 space-y-1.5"
                          >
                            <div className="flex items-start justify-between">
                              <div className="text-[11px] text-slate-700 dark:text-slate-300">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {sugg.action === "on" ? "BẬT" : "TẮT"} {sugg.device_name}
                                </span>
                                <span className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400">
                                  Lúc {sugg.time} (Các thứ:{" "}
                                  {(sugg.days || []).map((d: number) => (d === 0 || d === 7 ? "CN" : `T${d + 1}`)).join(", ")})
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleApplySuggestion(sugg)}
                                className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer text-[9px] font-bold h-6 px-2.5 rounded-lg shrink-0 ml-2"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Áp dụng
                              </Button>
                            </div>
                            {sugg.reason && (
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                {sugg.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {m.suggestion.length > 1 && (
                        <Button
                          size="sm"
                          onClick={() => handleApplySuggestion(m.suggestion)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white cursor-pointer text-[10px] font-bold h-8 rounded-xl mt-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Áp dụng tất cả {m.suggestion.length} cấu hình
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl px-3.5 py-2.5 text-xs bg-white border border-slate-100 text-slate-500 dark:bg-slate-900 dark:border-slate-800 flex items-center gap-2 rounded-tl-none">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Đang tải...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions footer */}
          <div className="px-4 py-2 border-t border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 flex flex-wrap gap-1.5 shrink-0 max-h-[85px] overflow-y-auto">
            {smartSuggestions.map((sugg, idx) => (
              <button
                key={idx}
                onClick={(e) => handleSend(e, sugg.prompt)}
                disabled={loading}
                className="text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 px-2.5 py-1.5 rounded-full border border-indigo-200/50 dark:border-indigo-900/30 flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <span>{sugg.emoji}</span> {sugg.label}
              </button>
            ))}
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0 bg-white dark:bg-slate-950"
          >
            <Input
              placeholder="Hỏi về xu hướng hoặc bất thường trong nhà..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-50 border-0 text-xs rounded-xl focus-visible:ring-indigo-500 h-9.5 text-slate-900 dark:text-white"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="h-9.5 w-9.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
