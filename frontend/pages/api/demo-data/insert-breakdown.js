import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[INSERT_BREAKDOWN_API] Initializing Supabase service client');
  console.log('[INSERT_BREAKDOWN_API] Supabase URL exists:', !!supabaseUrl);
  console.log('[INSERT_BREAKDOWN_API] Supabase service key exists:', !!supabaseServiceKey);
  
  // For local development/testing, use the provided key if environment variable is missing
  if (!supabaseServiceKey) {
    console.log('[INSERT_BREAKDOWN_API] Using fallback service role key for development');
    // This is intentionally hardcoded for development only - in production always use environment variables
    const fallbackKey = null; // Removed hardcoded key for security
    
    if (!supabaseUrl) {
      console.error('[INSERT_BREAKDOWN_API] Missing Supabase URL - cannot proceed');
      throw new Error('Missing Supabase URL');
    }
    
    return createClient(supabaseUrl, fallbackKey);
  }
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[INSERT_BREAKDOWN_API] Missing Supabase service role credentials');
    throw new Error('Missing Supabase service role credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[INSERT_BREAKDOWN_API] Invalid method for insert-breakdown endpoint:', req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Validate request body
  const { table, data } = req.body;
  
  if (!table || !data || !Array.isArray(data)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid request body. Required format: { table: "table_name", data: [...records] }' 
    });
  }
  
  // Only allow inserting into specific breakdown tables
  const allowedTables = [
    'demo_ad_insights_demographics',
    'demo_ad_set_insights_demographics',
    'demo_ad_insights_country',
    'demo_ad_set_insights_country',
    'demo_ad_insights_region',
    'demo_ad_set_insights_region',
    'demo_ad_insights_device',
    'demo_ad_set_insights_device',
    'demo_ad_insights_hourly',
    'demo_ad_set_insights_hourly',
    'demo_ad_insights_audience',
    'demo_ad_set_insights_audience'
  ];
  
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid table name: ${table}. Only breakdown tables are allowed.` 
    });
  }

  console.log(`[INSERT_BREAKDOWN_API] Received request to insert ${data.length} records into ${table}`);
  
  try {
    // Get admin Supabase client
    console.log('[INSERT_BREAKDOWN_API] Creating admin Supabase client');
    const supabaseAdmin = getServiceClient();
    console.log('[INSERT_BREAKDOWN_API] Admin client created successfully');
    
    // Validate the first record to ensure it matches the table schema
    if (data.length > 0) {
      console.log('[INSERT_BREAKDOWN_API] Sample record:', JSON.stringify(data[0], null, 2));
      
      // Validate table structure first
      console.log(`[INSERT_BREAKDOWN_API] Validating table structure for ${table}`);
      try {
        const { data: tableInfo, error: tableError } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.error(`[INSERT_BREAKDOWN_API] Error validating table structure:`, tableError);
        } else {
          console.log(`[INSERT_BREAKDOWN_API] Table validation successful. Table exists and is accessible.`);
          if (tableInfo.length > 0) {
            console.log(`[INSERT_BREAKDOWN_API] Table columns:`, Object.keys(tableInfo[0]));
          }
        }
      } catch (tableError) {
        console.error(`[INSERT_BREAKDOWN_API] Exception validating table:`, tableError);
      }
    }
    
    // Preprocess data to ensure all records have required fields and types
    console.log(`[INSERT_BREAKDOWN_API] Preprocessing data to ensure compatibility`);
    const processedData = data.map(record => {
      // Make a copy to avoid modifying the original
      const processedRecord = { ...record };
      
      // Ensure UUID fields are valid
      if (processedRecord.insight_id && typeof processedRecord.insight_id === 'string') {
        // UUID is already a string, no need to convert
      } else if (processedRecord.insight_id) {
        // Convert non-string UUID to string
        processedRecord.insight_id = String(processedRecord.insight_id);
      } else {
        // Generate a new UUID if missing
        processedRecord.insight_id = uuidv4();
        console.warn('[INSERT_BREAKDOWN_API] Generated missing insight_id for record');
      }
      
      // Ensure gender is lowercase if present
      if (processedRecord.gender) {
        processedRecord.gender = processedRecord.gender.toLowerCase();
      }
      
      // Add created_at if missing
      if (!processedRecord.created_at) {
        processedRecord.created_at = new Date().toISOString();
      }
      
      return processedRecord;
    });
    
    // Insert in batches to avoid hitting limits
    const BATCH_SIZE = 5; // Reduced batch size for more reliable insertion
    const batches = [];
    
    for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
      batches.push(processedData.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`[INSERT_BREAKDOWN_API] Splitting ${processedData.length} records into ${batches.length} batches of ${BATCH_SIZE}`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[INSERT_BREAKDOWN_API] Inserting batch ${i + 1}/${batches.length} (${batch.length} records) into ${table}...`);
      
      // Log the first record of each batch for debugging
      if (batch.length > 0) {
        console.log(`[INSERT_BREAKDOWN_API] First record of batch ${i + 1}:`, JSON.stringify(batch[0], null, 2));
      }
      
      try {
        // Use upsert instead of insert to handle potential duplicates
        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from(table)
          .upsert(batch, { onConflict: 'insight_id,age,gender' })
          .select();
        
        if (insertError) {
          console.error(`[INSERT_BREAKDOWN_API] Error inserting batch ${i + 1} into ${table}:`, insertError);
          console.error(`[INSERT_BREAKDOWN_API] Error code:`, insertError.code);
          console.error(`[INSERT_BREAKDOWN_API] Error details:`, insertError.details);
          errorCount += batch.length;
          errors.push({
            batch: i + 1,
            error: insertError.message,
            details: insertError
          });
          
          // Try inserting records one by one as fallback
          console.log(`[INSERT_BREAKDOWN_API] Attempting record-by-record insertion for batch ${i + 1}`);
          
          for (let j = 0; j < batch.length; j++) {
            try {
              const { error: singleError } = await supabaseAdmin
                .from(table)
                .upsert([batch[j]]);
              
              if (singleError) {
                console.error(`[INSERT_BREAKDOWN_API] Error inserting single record ${j} in batch ${i + 1}:`, singleError);
              } else {
                console.log(`[INSERT_BREAKDOWN_API] Successfully inserted single record ${j} in batch ${i + 1}`);
                successCount++;
                errorCount--; // Adjust count since we already counted the whole batch as error
              }
            } catch (singleError) {
              console.error(`[INSERT_BREAKDOWN_API] Exception inserting single record ${j} in batch ${i + 1}:`, singleError);
            }
          }
        } else {
          console.log(`[INSERT_BREAKDOWN_API] Successfully inserted batch ${i + 1} (${insertedData?.length || batch.length} records) into ${table}`);
          successCount += batch.length;
        }
      } catch (batchError) {
        console.error(`[INSERT_BREAKDOWN_API] Exception in batch ${i + 1}:`, batchError);
        errorCount += batch.length;
        errors.push({
          batch: i + 1,
          error: batchError.message,
          details: { stack: batchError.stack }
        });
      }
      
      // Add a small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify records were actually inserted
    try {
      console.log(`[INSERT_BREAKDOWN_API] Verifying records were inserted in ${table}`);
      const { count, error: countError } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error(`[INSERT_BREAKDOWN_API] Error counting records:`, countError);
      } else {
        console.log(`[INSERT_BREAKDOWN_API] Table ${table} now contains ${count} records`);
      }
    } catch (countError) {
      console.error(`[INSERT_BREAKDOWN_API] Error verifying insertion:`, countError);
    }
    
    if (errorCount > 0) {
      console.warn(`[INSERT_BREAKDOWN_API] Completed with partial success: ${successCount} records inserted, ${errorCount} failed`);
      return res.status(207).json({ 
        success: true, 
        partial: true,
        successCount,
        errorCount,
        errors: errors.slice(0, 5) // Only return first 5 errors to avoid too large response
      });
    }
    
    console.log(`[INSERT_BREAKDOWN_API] Successfully inserted all ${successCount} records into ${table}`);
    return res.status(200).json({ success: true, count: successCount });
  } catch (error) {
    console.error('[INSERT_BREAKDOWN_API] Error in insert-breakdown API:', error);
    console.error('[INSERT_BREAKDOWN_API] Error stack:', error.stack);
    console.error('[INSERT_BREAKDOWN_API] Error type:', error.name);
    console.error('[INSERT_BREAKDOWN_API] Error message:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    });
  }
} 