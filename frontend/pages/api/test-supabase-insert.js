// Test file for direct Supabase demographic insertion
import { createClient } from '@supabase/supabase-js';
import supabaseAdmin from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  try {
    console.log('[TEST_SUPABASE_INSERT] Starting test...');
    
    const result = await testDirectInsert();
    console.log('[TEST_SUPABASE_INSERT] Test completed:', result);
    
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('[TEST_SUPABASE_INSERT] Error in test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function testDirectInsert() {
  // Create test demographic breakdown records
  const demoRecords = [];
  const insightId = '00000000-0000-0000-0000-000000000001'; // Demo UUID
  
  // Create several age/gender demographic breakdowns for testing
  const ages = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const genders = ['male', 'female'];
  
  try {
    console.log('[TEST_SUPABASE_INSERT] Creating admin Supabase client');
    // Create a sample insight record first
    const supabase = supabaseAdmin;
    console.log('[TEST_SUPABASE_INSERT] Admin client created successfully');
    
    // First, insert a parent insight record
    console.log('[TEST_SUPABASE_INSERT] Inserting parent insight record');
    const { data: insightData, error: insightError } = await supabase
      .from('demo_ad_insights')
      .upsert([{
        id: insightId,
        ad_id: 'test_ad_123',
        ad_set_id: 'test_adset_123',
        campaign_id: 'test_campaign_123',
        ad_account_id: 'test_account_123',
        user_id: '00000000-0000-0000-0000-000000000001',
        date: new Date().toISOString().split('T')[0],
        impressions: 1000,
        clicks: 100,
        spend: 50,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (insightError) {
      console.error('[TEST_SUPABASE_INSERT] Error inserting parent insight:', insightError);
      throw new Error(`Failed to insert parent insight: ${insightError.message}`);
    }
    
    console.log('[TEST_SUPABASE_INSERT] Parent insight inserted successfully:', insightData);
    
    // Generate breakdown records
    console.log('[TEST_SUPABASE_INSERT] Generating demographic breakdown records');
    for (const age of ages) {
      for (const gender of genders) {
        const impressions = Math.floor(Math.random() * 200);
        const clicks = Math.floor(Math.random() * 20);
        const spend = Math.floor(Math.random() * 10);
        
        demoRecords.push({
          insight_id: insightId,
          age,
          gender,
          impressions,
          clicks,
          spend,
          created_at: new Date().toISOString()
        });
      }
    }
    
    console.log(`[TEST_SUPABASE_INSERT] Generated ${demoRecords.length} demographic breakdown records`);
    console.log('[TEST_SUPABASE_INSERT] Sample record:', JSON.stringify(demoRecords[0], null, 2));
    
    // First, try to insert with .select() to get more detailed error info
    console.log('[TEST_SUPABASE_INSERT] Attempting to insert first record with .select() for debugging');
    const { data: singleInsertData, error: singleInsertError } = await supabase
      .from('demo_ad_insights_demographics')
      .insert([demoRecords[0]])
      .select();
    
    if (singleInsertError) {
      console.error('[TEST_SUPABASE_INSERT] Error inserting single record:', singleInsertError);
      console.error('[TEST_SUPABASE_INSERT] Error code:', singleInsertError.code);
      console.error('[TEST_SUPABASE_INSERT] Error details:', singleInsertError.details);
      console.error('[TEST_SUPABASE_INSERT] Error hint:', singleInsertError.hint);
    } else {
      console.log('[TEST_SUPABASE_INSERT] Single record inserted successfully:', singleInsertData);
    }
    
    // Proceed with batch insert
    return await insertDemographicsWithDirectSupabase(
      'demo_ad_insights_demographics',
      demoRecords
    );
  } catch (error) {
    console.error('[TEST_SUPABASE_INSERT] Error in test setup:', error);
    throw error;
  }
}

async function insertDemographicsWithDirectSupabase(tableName, records) {
  console.log(`[INSERT_DIRECT] Starting direct Supabase insertion for ${records.length} records into ${tableName}`);
  
  try {
    const supabase = supabaseAdmin;
    console.log('[INSERT_DIRECT] Admin client created for batch insertion');
    
    const BATCH_SIZE = 2; // Even smaller batch size for maximum reliability
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    console.log(`[INSERT_DIRECT] Inserting ${records.length} records into ${tableName} in batches of ${BATCH_SIZE}`);
    
    // Validate table structure first
    console.log(`[INSERT_DIRECT] Validating table structure`);
    const { data: tableInfo, error: tableError } = await supabase
      .from('demo_ad_insights_demographics')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error(`[INSERT_DIRECT] Error validating table structure:`, tableError);
    } else {
      console.log(`[INSERT_DIRECT] Table validation successful. Columns:`, 
        tableInfo.length > 0 ? Object.keys(tableInfo[0]) : 'No data returned');
    }
    
    // Insert in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      console.log(`[INSERT_DIRECT] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(records.length/BATCH_SIZE)}`);
      
      if (batch.length > 0) {
        console.log(`[INSERT_DIRECT] First record in batch:`, JSON.stringify(batch[0]));
      }
      
      try {
        // Use upsert instead of insert to handle potential duplicates and try with .select()
        const { data, error } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: 'insight_id,age,gender' })
          .select();
        
        if (error) {
          console.error(`[INSERT_DIRECT] Error inserting batch:`, error);
          console.error(`[INSERT_DIRECT] Error code:`, error.code);
          console.error(`[INSERT_DIRECT] Error details:`, error.details);
          console.error(`[INSERT_DIRECT] Error hint:`, error.hint);
          errorCount += batch.length;
          errors.push(error);
        } else {
          console.log(`[INSERT_DIRECT] Successfully inserted batch with ${data.length} records`);
          successCount += data.length;
        }
      } catch (batchError) {
        console.error(`[INSERT_DIRECT] Exception during batch insert:`, batchError);
        errorCount += batch.length;
        errors.push(batchError);
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify successful insertion
    console.log(`[INSERT_DIRECT] Verifying insertion by counting records`);
    const { data: countData, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`[INSERT_DIRECT] Error counting records:`, countError);
    } else {
      console.log(`[INSERT_DIRECT] Table now contains ${countData.count} records`);
    }
    
    return {
      totalRecords: records.length,
      successCount,
      errorCount,
      finalCount: countData?.count,
      errorSample: errors.length > 0 ? errors[0] : null
    };
  } catch (error) {
    console.error('[INSERT_DIRECT] Critical error in direct Supabase insertion:', error);
    return {
      totalRecords: records.length,
      successCount: 0,
      errorCount: records.length,
      errorSample: error
    };
  }
} 