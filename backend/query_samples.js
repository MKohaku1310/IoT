const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.rpc('get_sensor_trend', { range_type: 'today' });
  if (error) {
    console.error("RPC Error:", error);
  } else {
    const nonNull = data.filter(d => d.temp !== null);
    console.log("get_sensor_trend('today') total rows:", data.length);
    console.log("Non-null rows:", nonNull);
  }

  // Let's execute raw SQL or run some diagnostic queries if we can.
  // Wait, we don't have direct SQL run permission unless we use a function or another table.
  // But we can check the range of timestamps in `dulieucambien` table.
  const { data: rangeData, error: rangeErr } = await supabase
    .from('dulieucambien')
    .select('thoigian')
    .order('thoigian', { ascending: true });

  if (rangeErr) {
    console.error(rangeErr);
  } else {
    console.log("First record:", rangeData[0]);
    console.log("Last record:", rangeData[rangeData.length - 1]);
    console.log("Total records:", rangeData.length);
  }
}

run();
