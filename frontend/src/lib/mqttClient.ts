/**
 * MQTT over WebSocket – Kết nối trực tiếp từ Frontend đến MQTT Broker
 *
 * MỤC ĐÍCH: Giảm độ trễ điều khiển thiết bị.
 *
 * TRƯỚC:  Web → Supabase write → [Realtime ~500ms] → Backend → MQTT → ESP32
 * SAU:    Web → MQTT trực tiếp → ESP32  (~200ms)
 *                ↓ song song
 *         Web → Supabase write (lưu lịch sử)
 */

import mqtt, { type MqttClient, type IClientOptions } from "mqtt";

const DEFAULT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const DEFAULT_PREFIX = "buivansang_iot_pj";

const BROKER_WS_URL = typeof window !== "undefined"
  ? window.localStorage.getItem("sh-mqtt-broker") || DEFAULT_BROKER
  : DEFAULT_BROKER;

const TOPIC_PREFIX = typeof window !== "undefined"
  ? window.localStorage.getItem("sh-mqtt-prefix") || DEFAULT_PREFIX
  : DEFAULT_PREFIX;

export const CTRL_TOPICS = {
  LED1: `${TOPIC_PREFIX}/led1`,
  LED2: `${TOPIC_PREFIX}/led2`,
  LED3: `${TOPIC_PREFIX}/led3`,
  AUTO1: `${TOPIC_PREFIX}/automode1`,
  AUTO2: `${TOPIC_PREFIX}/automode2`,
  AUTO3: `${TOPIC_PREFIX}/automode3`,
  THRESHOLD_TEMP: `${TOPIC_PREFIX}/threshold/temp`,
  THRESHOLD_HUM:  `${TOPIC_PREFIX}/threshold/hum`,
  THRESHOLD_LUX:  `${TOPIC_PREFIX}/threshold/lux`,
} as const;

/**
 * Lấy topic MQTT cho thiết bị theo loai_thietbi và nodeId
 */
export function getDeviceMqttTopic(
  loaiThietBi: string,
  nodeId?: string
): { ctrl: string; auto: string } | null {
  const prefix = nodeId ? `${TOPIC_PREFIX}/${nodeId}` : TOPIC_PREFIX;
  if (loaiThietBi === "dieu_hoa") {
    return { ctrl: `${prefix}/led1`, auto: `${prefix}/automode1` };
  }
  if (loaiThietBi === "quat") {
    return { ctrl: `${prefix}/led2`, auto: `${prefix}/automode2` };
  }
  if (loaiThietBi === "den") {
    return { ctrl: `${prefix}/led3`, auto: `${prefix}/automode3` };
  }
  return null;
}


// ----------------------------------------------------------------
// Singleton MQTT client (tái sử dụng 1 kết nối WS duy nhất)
// ----------------------------------------------------------------
let _client: MqttClient | null = null;
let _connectPromise: Promise<MqttClient> | null = null;
let _connected = false;

// ----------------------------------------------------------------
// Subscriber pattern: để UI component theo dõi trạng thái kết nối thực
// ----------------------------------------------------------------
type ConnectionStatus = "connecting" | "online" | "offline";
type StatusListener = (status: ConnectionStatus) => void;
const _listeners = new Set<StatusListener>();
let _currentStatus: ConnectionStatus = "connecting";

let _statusTimeout: any = null;
let _connectingStartedAt: number | null = null;

function _notifyListeners(status: ConnectionStatus) {
  const prevStatus = _currentStatus;
  _currentStatus = status;
  _listeners.forEach((fn) => fn(status));

  // Nếu chuyển sang trạng thái khác connecting thì dọn dẹp bộ đếm
  if (status !== "connecting") {
    if (_statusTimeout) {
      clearTimeout(_statusTimeout);
      _statusTimeout = null;
    }
    _connectingStartedAt = null;
    return;
  }

  // Nếu bắt đầu kết nối (hoặc vừa chuyển từ trạng thái khác sang connecting)
  if (prevStatus !== "connecting" || !_connectingStartedAt) {
    _connectingStartedAt = Date.now();
    
    if (_statusTimeout) {
      clearTimeout(_statusTimeout);
    }
    
    _statusTimeout = setTimeout(() => {
      if (_currentStatus === "connecting") {
        console.warn("[MQTT] ⚠️ Trạng thái kết nối connecting bị treo quá 6s. Đặt thành offline.");
        _statusTimeout = null;
        _connectingStartedAt = null;
        _notifyListeners("offline");
      }
    }, 6000);
  }
}

/**
 * Đăng ký callback được gọi khi trạng thái kết nối MQTT thay đổi.
 * @returns hàm unsubscribe để hủy đăng ký khi component unmount
 */
export function onMqttStatus(fn: StatusListener): () => void {
  _listeners.add(fn);
  // Gọi ngay với trạng thái hiện tại để sync UI lúc mới mount
  fn(_currentStatus);
  return () => _listeners.delete(fn);
}

// ----------------------------------------------------------------
// Subscriber pattern cho tin nhắn MQTT
// ----------------------------------------------------------------
type MessageListener = (topic: string, payload: string) => void;
const _msgListeners = new Set<MessageListener>();

/**
 * Đăng ký lắng nghe tin nhắn trên một topic MQTT cụ thể.
 * @returns hàm unsubscribe để hủy đăng ký
 */
export function mqttSubscribe(topic: string, fn: (payload: string) => void): () => void {
  const listener: MessageListener = (t, p) => {
    if (t === topic) {
      fn(p);
    }
  };
  _msgListeners.add(listener);

  // Đăng ký topic trên broker
  if (_client && _client.connected) {
    _client.subscribe(topic, (err) => {
      if (err) console.error(`[MQTT] Lỗi subscribe ${topic}:`, err.message);
    });
  } else {
    createClient().then((client) => {
      client.subscribe(topic, (err) => {
        if (err) console.error(`[MQTT] Lỗi subscribe ${topic}:`, err.message);
      });
    });
  }

  return () => {
    _msgListeners.delete(listener);
  };
}

function createClient(): Promise<MqttClient> {
  if (_connectPromise) return _connectPromise;

  _connectPromise = new Promise((resolve, reject) => {
    const options: IClientOptions = {
      clientId: `smarthome-web-${Math.random().toString(36).slice(2, 8)}`,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
      keepalive: 60,
    };

    _notifyListeners("connecting");
    const client = mqtt.connect(BROKER_WS_URL, options);

    client.on("connect", () => {
      _connected = true;
      _notifyListeners("online");
      console.info("[MQTT] ✅ Đã kết nối WebSocket tới HiveMQ broker.");
      // Tự động đăng ký lại các topic khi kết nối thành công nếu có listener
      // Tuy nhiên, mqtt.js tự động xử lý resubscribe nên ta không cần làm thủ công.
      resolve(client);
    });

    client.on("reconnect", () => {
      _notifyListeners("connecting");
      console.info("[MQTT] 🔄 Đang kết nối lại MQTT broker...");
    });

    client.on("close", () => {
      _connected = false;
      _notifyListeners("offline");
      console.warn("[MQTT] ⚠️ Kết nối MQTT đã đóng.");
    });

    client.on("offline", () => {
      _connected = false;
      _notifyListeners("offline");
      console.warn("[MQTT] ⚠️ MQTT client offline.");
    });

    client.on("error", (err) => {
      _connected = false;
      _notifyListeners("offline");
      console.error("[MQTT] ❌ Lỗi kết nối:", err.message);
      // Không reject ở đây để reconnect tự động hoạt động
    });

    client.on("message", (topic, payload) => {
      const payloadStr = payload.toString();
      _msgListeners.forEach((fn) => fn(topic, payloadStr));
    });

    _client = client;

    // Timeout lần kết nối đầu (8s): nếu chưa connect được thì vẫn resolve để không block UI
    setTimeout(() => {
      if (!_connected) {
        console.warn("[MQTT] ⚠️ Kết nối lần đầu timeout (8s). Sẽ tiếp tục thử lại ngầm.");
        // Không set offline ở đây vì reconnect vẫn đang chạy nguyên
        resolve(client);
      }
    }, 8000);
  });

  return _connectPromise;
}

/**
 * Khởi tạo kết nối MQTT ngầm khi app load.
 * Gọi hàm này 1 lần trong component gốc.
 */
export async function initMqttClient(): Promise<void> {
  await createClient();
}

/**
 * Publish một lệnh MQTT với độ trễ thấp nhất.
 * Nếu chưa kết nối, tin nhắn sẽ được queue và gửi ngay khi kết nối xong.
 *
 * @param topic  Topic MQTT (dùng CTRL_TOPICS.*) 
 * @param payload Nội dung gửi đi ("ON" / "OFF" / giá trị số)
 * @param qos    Quality of Service (0 = nhanh nhất, 1 = có xác nhận)
 */
export async function mqttPublish(
  topic: string,
  payload: string,
  qos: 0 | 1 = 0
): Promise<void> {
  try {
    const client = await createClient();
    client.publish(topic, payload, { qos, retain: false }, (err) => {
      if (err) {
        console.error(`[MQTT] Lỗi publish ${topic}:`, err.message);
      } else {
        console.info(`[MQTT] ✉️ Đã publish: ${topic} = "${payload}" (QoS ${qos})`);
      }
    });
  } catch (err) {
    console.error("[MQTT] Không thể publish:", err);
  }
}

/** Lấy trạng thái kết nối hiện tại */
export function isMqttConnected(): boolean {
  return _connected && (_client?.connected ?? false);
}
