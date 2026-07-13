const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    console.log("Calling get_sensor_trend('7d')...");
    const { data: data7, error: error7 } = await supabase.rpc("get_sensor_trend", {
      range_type: "7d"
    });
    if (error7) throw error7;
    console.log(`7d returned ${data7.length} rows.`);
    console.log("7d rows:", data7);

    console.log("Calling get_sensor_trend('30d')...");
    const { data: data30, error: error30 } = await supabase.rpc("get_sensor_trend", {
      range_type: "30d"
    });
    if (error30) throw error30;
    console.log(`30d returned ${data30.length} rows.`);
    console.log("30d sample rows with data:", data30.filter(d => d.temp !== null));

    console.log("Calling get_sensor_heatmap()...");
    const { data: dataHeat, error: errorHeat } = await supabase.rpc("get_sensor_heatmap");
    if (errorHeat) throw errorHeat;
    console.log(`Heatmap returned ${dataHeat.length} rows.`);
    console.log("Heatmap sample rows with data:", dataHeat.filter(d => d.avg_temp !== null));

  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
