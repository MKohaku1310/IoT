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
  console.log('Connected to MQTT broker! Sending simulated telemetry every 5 seconds...');
  
  setInterval(() => {
    const temp = (25 + Math.random() * 8).toFixed(1);
    const hum = (60 + Math.random() * 25).toFixed(1);
    const lux = (100 + Math.random() * 400).toFixed(0);

    console.log(`[Sim] Publishing: Temp=${temp}°C, Hum=${hum}%, Lux=${lux} lx`);
    
    // Publish temperature, humidity, and light
    client.publish(TOPICS.TEMP, String(temp), { qos: 1 });
    client.publish(TOPICS.HUM, String(hum), { qos: 1 });
    client.publish(TOPICS.LUX, String(lux), { qos: 1 });
  }, 5000);
});

client.on('error', (err) => {
  console.error('MQTT error:', err);
});
