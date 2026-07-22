const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { data: alerts, error: alertError } = await supabase.from('canh_bao_ky_thuat').select('*');
    if (alertError) throw alertError;
    console.log('ALERTS:', JSON.stringify(alerts, null, 2));
    console.log(`Total alerts: ${alerts?.length || 0}`);
  } catch (e) {
    console.error('ERROR:', e);
  }
})();
