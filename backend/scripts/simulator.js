const mqtt = require('mqtt');

const mqttBrokerUrl = 'mqtt://broker.hivemq.com';
const TOPIC_PREFIX = 'buivansang_iot_pj';

const TOPICS = {
  TEMP: `${TOPIC_PREFIX}/temp`,
  HUM: `${TOPIC_PREFIX}/hum`,
  LUX: `${TOPIC_PREFIX}/lux`,
};

console.log(`Connecting to MQTT broker at ${mqttBrokerUrl}...`);
const client = mqtt.connect(mqttBrokerUrl);

client.on('connect', () => {
  console.log('Connected to MQTT broker! Sending simulated telemetry and node heartbeats every 20 seconds...');
  
  const bootTime = Date.now();
  setInterval(() => {
    const temp = (25 + Math.random() * 8).toFixed(1);
    const hum = (60 + Math.random() * 25).toFixed(1);
    const lux = (100 + Math.random() * 400).toFixed(0);
    const uptimeSeconds = Math.floor((Date.now() - bootTime) / 1000);

    console.log(`[Sim] Publishing: Temp=${temp}°C, Hum=${hum}%, Lux=${lux} lx, Uptime=${uptimeSeconds}s`);
    
    // Publish temperature, humidity, and light
    client.publish(TOPICS.TEMP, String(temp), { qos: 1 });
    client.publish(TOPICS.HUM, String(hum), { qos: 1 });
    client.publish(TOPICS.LUX, String(lux), { qos: 1 });
    client.publish('buivansang_iot_pj/s3-node-01/uptime', String(uptimeSeconds), { qos: 1, retain: true });

    // Publish JSON heartbeats for simulated nodes
    const node1Heartbeat = JSON.stringify({
      rssi: -50 - Math.floor(Math.random() * 15),
      cpu_temp: +(37 + Math.random() * 5).toFixed(1),
      flash_used: 42.50,
      firmware: "1.0.0"
    });
    const node2Heartbeat = JSON.stringify({
      rssi: -60 - Math.floor(Math.random() * 15),
      cpu_temp: +(39 + Math.random() * 5).toFixed(1),
      flash_used: 48.10,
      firmware: "1.0.0"
    });

    client.publish('buivansang_iot_pj/ESP32-S3-Node-01/heartbeat', node1Heartbeat, { qos: 1 });
    client.publish('buivansang_iot_pj/ESP32-S3-Node-02/heartbeat', node2Heartbeat, { qos: 1 });
  }, 20000);
});

client.on('error', (err) => {
  console.error('MQTT error:', err);
});
