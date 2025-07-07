require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseFunction() {
  console.log('Starting Supabase function test...');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Key exists:', !!process.env.SUPABASE_SERVICE_KEY);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log('Created Supabase client');
    console.log('Calling analyze_campaign_performance function...');

    const { data, error } = await supabase.rpc('analyze_campaign_performance');

    if (error) {
      console.error('Error calling function:', error);
      return;
    }

    console.log('Successfully retrieved data:');
    console.log('Data keys:', Object.keys(data));
    console.log('------');
    
    // Log data structure but limit output size
    if (data.ad_level_analysis) {
      console.log(`Ad level analysis: ${data.ad_level_analysis.length} entries`);
      if (data.ad_level_analysis.length > 0) {
        console.log('Sample ad:', JSON.stringify(data.ad_level_analysis[0], null, 2));
      }
    }
    
    if (data.demographic_analysis) {
      console.log(`Demographic analysis: ${data.demographic_analysis.length} entries`);
      if (data.demographic_analysis.length > 0) {
        console.log('Sample demographic:', JSON.stringify(data.demographic_analysis[0], null, 2));
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the test
testSupabaseFunction(); 