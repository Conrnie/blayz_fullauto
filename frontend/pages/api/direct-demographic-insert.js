// Direct demographic insertion test endpoint
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  try {
    console.log('[DIRECT_INSERT_API] Starting direct demographic insertion test...');
    
    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[DIRECT_INSERT_API] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }
    
    console.log('[DIRECT_INSERT_API] Creating Supabase client');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create test data
    const insightId = uuidv4();
    console.log(`[DIRECT_INSERT_API] Generated insight ID: ${insightId}`);
    
    // First, create a parent insight record
    console.log('[DIRECT_INSERT_API] Creating parent insight record');
    const { data: insightData, error: insightError } = await supabase
      .from('demo_ad_insights')
      .insert([{
        id: insightId,
        ad_id: 'test_ad_direct',
        ad_set_id: 'test_adset_direct',
        campaign_id: 'test_campaign_direct',
        ad_account_id: 'test_account_direct',
        user_id: '00000000-0000-0000-0000-000000000001',
        date: new Date().toISOString().split('T')[0],
        impressions: 1000,
        clicks: 100,
        spend: 50,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (insightError) {
      console.error('[DIRECT_INSERT_API] Error creating parent insight:', insightError);
      return res.status(500).json({ success: false, error: 'Error creating parent insight', details: insightError });
    }
    
    console.log('[DIRECT_INSERT_API] Successfully created parent insight');
    
    // Create demographic breakdown records
    const demoBreakdowns = [];
    const ages = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const genders = ['male', 'female'];
    
    for (const age of ages) {
      for (const gender of genders) {
        demoBreakdowns.push({
          insight_id: insightId,
          age,
          gender,
          impressions: Math.floor(Math.random() * 200),
          clicks: Math.floor(Math.random() * 20),
          spend: Math.floor(Math.random() * 10),
          created_at: new Date().toISOString()
        });
      }
    }
    
    console.log(`[DIRECT_INSERT_API] Created ${demoBreakdowns.length} demographic breakdown records`);
    console.log('[DIRECT_INSERT_API] Sample record:', JSON.stringify(demoBreakdowns[0], null, 2));
    
    // Insert breakdown records one by one to maximize success chances
    console.log('[DIRECT_INSERT_API] Inserting breakdown records one by one');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < demoBreakdowns.length; i++) {
      try {
        const { data, error } = await supabase
          .from('demo_ad_insights_demographics')
          .insert([demoBreakdowns[i]])
          .select();
        
        if (error) {
          console.error(`[DIRECT_INSERT_API] Error inserting record ${i}:`, error);
          errorCount++;
        } else {
          console.log(`[DIRECT_INSERT_API] Successfully inserted record ${i}`);
          successCount++;
        }
      } catch (error) {
        console.error(`[DIRECT_INSERT_API] Exception inserting record ${i}:`, error);
        errorCount++;
      }
      
      // Add a small delay between insertions
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Check the count in the table
    const { data: countData, error: countError } = await supabase
      .from('demo_ad_insights_demographics')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('[DIRECT_INSERT_API] Error getting count:', countError);
    } else {
      console.log(`[DIRECT_INSERT_API] Table now contains ${countData.count} records`);
    }
    
    return res.status(200).json({
      success: true,
      successCount,
      errorCount,
      totalCount: countData?.count || 'unknown'
    });
  } catch (error) {
    console.error('[DIRECT_INSERT_API] Unexpected error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
} 