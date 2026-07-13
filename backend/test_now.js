const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: nowData, error: nowError } = await supabase.rpc('get_sensor_trend', { range_type: 'today' });
    if (nowError) {
      // If RPC fails, try executing a custom query
      console.error("RPC Error:", nowError);
    } else {
      console.log("RPC get_sensor_trend('today') data count:", nowData.length);
      console.log("Non-null rows in RPC:", nowData.filter(d => d.temp !== null));
    }

    // Let's also check if we can select direct values using a query that calls postgres functions
    // Since we don't have direct SQL client, we can query a dummy table or run a query.
    // Wait, we can run a simple query on dulieucambien checking the thoigian bounds of today
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);
    
    const { count, error } = await supabase
      .from('dulieucambien')
      .select('*', { count: 'exact', head: true })
      .gte('thoigian', todayStart.toISOString())
      .lte('thoigian', todayEnd.toISOString());
      
    console.log(`Supabase query for today's records (${todayStart.toISOString()} to ${todayEnd.toISOString()}):`);
    console.log(`Count: ${count}, Error: ${error ? error.message : 'none'}`);

  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
