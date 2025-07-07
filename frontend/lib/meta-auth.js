import supabase from './supabase';

// Global storage tracking for token operations
const tokenOperations = new Map();

// Global tracking for token exchange attempts
let lastExchangeAttempt = {
  userId: null,
  token: null,
  timestamp: 0
};

/**
 * Ensure the user_facebook_tokens table exists in Supabase
 * @returns {Promise<boolean>} True if the table exists or was created
 */
export async function ensureFacebookTokensTable() {
  console.log('Checking if user_facebook_tokens table exists...');

  try {
    // First check if the table exists by trying to select from it
    const { error } = await supabase
      .from('user_facebook_tokens')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    // If no error, table exists
    if (!error) {
      console.log('user_facebook_tokens table exists');
      return true;
    }

    // If error is not about missing relations, something else is wrong
    if (!error.message.includes('relation') && !error.message.includes('does not exist')) {
      console.error('Unknown error checking table:', error);
      return false;
    }

    console.log('Table does not exist, attempting to create it...');

    // We can't create tables from the client side using Supabase client
    // Instead, let's show a helpful message about setting up the table
    console.warn(`
      The user_facebook_tokens table doesn't exist. 
      Please create it in the Supabase dashboard with the following SQL:
      
      CREATE TABLE public.user_facebook_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        access_token_shortlived TEXT NOT NULL,
        access_token_longlived TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      ALTER TABLE public.user_facebook_tokens ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can manage their own tokens"
      ON public.user_facebook_tokens
      FOR ALL
      USING (auth.uid() = user_id);
    `);

    // For now, return false to indicate the table doesn't exist
    return false;
  } catch (err) {
    console.error('Error ensuring facebook tokens table:', err);
    return false;
  }
}

/**
 * Store Meta access token in the database
 * @param {string} userId - The user's ID
 * @param {string} accessToken - The Meta access token
 * @returns {Promise} - Promise resolving to the insert result
 */
export async function storeMetaToken(userId, accessToken) {
  console.log('==== META TOKEN STORAGE STARTED ====');
  console.log('UserID:', userId);
  console.log('Token received (first 10 chars):', accessToken ? accessToken.substring(0, 10) + '...' : 'NO TOKEN');
  console.log('Supabase client type:', typeof supabase);
  
  // Check for duplicate operations in this session
  const operationKey = `${userId}:${accessToken?.substring(0, 20)}`;
  
  if (tokenOperations.has(operationKey)) {
    const timestamp = tokenOperations.get(operationKey);
    const now = Date.now();
    const threeMinutesMs = 3 * 60 * 1000;
    
    // If the same operation was performed in the last 3 minutes, skip
    if ((now - timestamp) < threeMinutesMs) {
      console.log('DUPLICATE TOKEN STORAGE OPERATION DETECTED - SAME USER/TOKEN WAS PROCESSED RECENTLY');
      console.log('Time since last attempt:', Math.round((now - timestamp)/1000), 'seconds ago');
      console.log('==== META TOKEN STORAGE SKIPPED (DUPLICATE) ====');
      return [{ status: 'skipped', reason: 'duplicate_operation' }];
    }
  }
  
  // Record this operation attempt
  tokenOperations.set(operationKey, Date.now());
  console.log('Recording token operation to prevent duplicates');
  
  // Early validation
  if (!userId) {
    console.error('Invalid user ID provided');
    throw new Error('Invalid user ID provided');
  }
  
  if (!accessToken) {
    console.error('No access token provided');
    throw new Error('No access token provided');
  }
  
  try {
    // Verify we're using a real client
    if (!supabase.debug?.isRealClient) {
      console.warn('WARNING: Using mock Supabase client - token storage will not work!');
    }
    
    // First ensure the table exists
    const tableExists = await ensureFacebookTokensTable();
    if (!tableExists) {
      throw new Error('Facebook tokens table does not exist. Please create it in Supabase.');
    }
    
    // Check if record already exists for this user with this token
    console.log('Checking if this exact token is already stored...');
    const { data: existingExactTokens, error: exactCheckError } = await supabase
      .from('user_facebook_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('access_token_shortlived', accessToken);
    
    if (exactCheckError) {
      console.log('Error checking for exact token match:', exactCheckError.message);
    } else if (existingExactTokens && existingExactTokens.length > 0) {
      console.log('This exact token is already stored for this user. No need to store again.');
      console.log('==== META TOKEN STORAGE SKIPPED (ALREADY EXISTS) ====');
      return existingExactTokens;
    }
    
    // Try a direct single insert first - this is most reliable
    console.log('Attempting direct token insert...');
    try {
      const { data: directInsertData, error: directInsertError } = await supabase
        .from('user_facebook_tokens')
        .insert({
          user_id: userId,
          access_token_shortlived: accessToken
        })
        .select();
      
      if (!directInsertError) {
        console.log('Direct insert successful!', directInsertData);
        console.log('==== META TOKEN STORAGE COMPLETED ====');
        return directInsertData;
      } else {
        console.log('Direct insert failed, likely due to duplicate key. Proceeding to upsert...');
        console.log('Insert error:', directInsertError);
      }
    } catch (directInsertErr) {
      console.error('Error during direct insert attempt:', directInsertErr);
    }
    
    // Check if records exist for this user
    console.log('Checking for existing token records...');
    const { data: existingTokens, error: countError } = await supabase
      .from('user_facebook_tokens')
      .select('*')
      .eq('user_id', userId);
    
    console.log('Existing tokens query result:', existingTokens ? `Found ${existingTokens.length} records` : 'No records found');
    if (countError) {
      console.error('Error checking for existing tokens:', countError);
    }
    
    // If multiple records exist, clean up duplicates
    if (existingTokens && existingTokens.length > 1) {
      console.warn(`Found ${existingTokens.length} token records for user ${userId}. This is unexpected. Cleaning up...`);
      
      // Keep the first record and delete others
      const idsToDelete = existingTokens.slice(1).map(token => token.id);
      console.log(`Keeping record ${existingTokens[0].id}, deleting ${idsToDelete.length} duplicates`);
      
      // Delete duplicate records if any IDs to delete
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_facebook_tokens')
          .delete()
          .in('id', idsToDelete);
          
        if (deleteError) {
          console.error('Error deleting duplicate token records:', deleteError);
        } else {
          console.log('Successfully deleted duplicate token records');
        }
      }
      
      // Now update the remaining record
      console.log('Updating existing token record...');
      const { data: updateData, error: updateError } = await supabase
        .from('user_facebook_tokens')
        .update({
          access_token_shortlived: accessToken
        })
        .eq('id', existingTokens[0].id)
        .select();
      
      if (updateError) {
        console.error('Error updating token record:', updateError);
        throw updateError;
      }
      
      console.log('Successfully updated token record');
      console.log('==== META TOKEN STORAGE COMPLETED ====');
      return updateData;
    }
    // If exactly one record exists, update it
    else if (existingTokens && existingTokens.length === 1) {
      console.log('Found one existing token record. Updating...');
      const { data: updateData, error: updateError } = await supabase
        .from('user_facebook_tokens')
        .update({
          access_token_shortlived: accessToken
        })
        .eq('id', existingTokens[0].id)
        .select();
      
      if (updateError) {
        console.error('Error updating token record:', updateError);
        throw updateError;
      }
      
      console.log('Successfully updated token record');
      console.log('==== META TOKEN STORAGE COMPLETED ====');
      return updateData;
    }
    // If no records exist, insert a new one
    else {
      console.log('No existing token record. Creating new record...');
      const { data: insertData, error: insertError } = await supabase
        .from('user_facebook_tokens')
        .insert({
          user_id: userId,
          access_token_shortlived: accessToken
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting token record:', insertError);
        throw insertError;
      }
      
      console.log('Successfully inserted token record');
      console.log('==== META TOKEN STORAGE COMPLETED ====');
      return insertData;
    }
  } catch (error) {
    console.error('==== META TOKEN STORAGE FAILED ====');
    console.error('Error details:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Try an emergency last-resort method to store token
    try {
      console.log('Attempting emergency token storage as direct SQL...');
      // This is a last resort when other methods fail
      const { error: emergencyError } = await supabase
        .from('user_facebook_tokens')
        .upsert({
          user_id: userId,
          access_token_shortlived: accessToken
        }, {
          onConflict: 'user_id'
        });
        
      if (emergencyError) {
        console.error('Emergency storage also failed:', emergencyError);
      } else {
        console.log('Emergency token storage succeeded!');
        return [{ user_id: userId, emergency_stored: true }];
      }
    } catch (emergencyErr) {
      console.error('Exception during emergency storage:', emergencyErr);
    }
    
    throw error;
  }
}

/**
 * Attempt to verify a Facebook token is valid by calling the Graph API
 * @param {string} token 
 * @returns {Promise<{valid: boolean, data?: any, error?: Error}>}
 */
export async function verifyFacebookToken(token) {
  console.log('Verifying Facebook token with Graph API...');
  
  if (!token) {
    console.error('No token provided for verification');
    return { valid: false, error: new Error('No token provided') };
  }
  
  try {
    // Try a simple Graph API request to verify the token is valid
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Facebook API verification failed:', errorText);
      return { valid: false, error: new Error(`Facebook API error: ${errorText}`) };
    }
    
    const data = await response.json();
    console.log('Facebook API verification successful:', data);
    
    return { valid: true, data };
  } catch (error) {
    console.error('Error verifying Facebook token:', error);
    return { valid: false, error };
  }
}

/**
 * Try to extract a token from the URL params
 * This is a fallback when the token isn't in the normal locations
 */
export function extractTokenFromUrlParams() {
  if (typeof window === 'undefined') return null;
  
  console.log('Attempting to extract token from URL params...');
  
  try {
    // First try the hash (fragment)
    if (window.location.hash) {
      const hash = window.location.hash;
      
      // Match common token patterns
      const patterns = [
        /access_token=([^&]+)/,
        /provider_token=([^&]+)/,
        /token=([^&]+)/,
        /oauth_token=([^&]+)/
      ];
      
      for (const pattern of patterns) {
        const match = hash.match(pattern);
        if (match && match[1]) {
          const token = decodeURIComponent(match[1]);
          console.log(`Token found in hash using pattern ${pattern}:`, token.substring(0, 10) + '...');
          return { token, source: `hash-${pattern}` };
        }
      }
    }
    
    // Next try query params
    if (window.location.search) {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      
      const possibleParams = ['access_token', 'provider_token', 'oauth_token', 'token'];
      for (const param of possibleParams) {
        if (params.has(param)) {
          const token = params.get(param);
          console.log(`Token found in query param ${param}:`, token.substring(0, 10) + '...');
          return { token, source: `query-${param}` };
        }
      }
    }
    
    console.log('No token found in URL params');
    return null;
  } catch (error) {
    console.error('Error extracting token from URL:', error);
    return null;
  }
}

/**
 * Exchanges a short-lived Facebook token for a long-lived token (valid for 60 days)
 * @param {string} userId - Supabase user ID
 * @param {string} shortLivedToken - The short-lived token to exchange
 * @param {object} supabaseClient - Supabase client (optional, will use default if not provided)
 * @returns {Promise<object>} - Result of the token exchange and database update
 */
export async function exchangeForLongLivedToken(userId, shortLivedToken, supabaseClient) {
  console.log('==== FACEBOOK TOKEN EXCHANGE STARTED ====');
  console.log(`UserID: ${userId}`);
  console.log(`Short-lived token received (first 10 chars): ${shortLivedToken.substring(0, 10)}...`);

  // Use the provided client or fall back to the default
  const client = supabaseClient || supabase;
  
  // Prevent duplicate operations
  const now = Date.now();
  if (lastExchangeAttempt.userId === userId && 
      lastExchangeAttempt.token === shortLivedToken &&
      (now - lastExchangeAttempt.timestamp) < 10000) { // 10 seconds
    console.log('DUPLICATE TOKEN EXCHANGE OPERATION DETECTED - SAME EXCHANGE WAS ATTEMPTED RECENTLY');
    console.log(`Time since last attempt: ${Math.floor((now - lastExchangeAttempt.timestamp)/1000)} seconds ago`);
    console.log('==== FACEBOOK TOKEN EXCHANGE SKIPPED (DUPLICATE) ====');
    throw new Error('Duplicate operation');
  }

  // Record this attempt to prevent duplicates
  lastExchangeAttempt = {
    userId,
    token: shortLivedToken,
    timestamp: now
  };

  try {
    // Access environment variables correctly for browser environment
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.NEXT_PUBLIC_FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('Missing Facebook App credentials in environment variables');
      throw new Error('Missing Facebook App credentials');
    }

    // Facebook Graph API endpoint for token exchange
    const fbExchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token`;
    
    console.log('Calling Facebook Graph API to exchange token...');
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken
    });
    
    const response = await fetch(`${fbExchangeUrl}?${params.toString()}`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error exchanging token with Facebook:', errorText);
      return { success: false, error: 'Facebook API error', details: errorText };
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      console.error('Facebook response missing access_token:', data);
      return { success: false, error: 'Invalid response from Facebook', details: data };
    }
    
    console.log('Successfully received long-lived token from Facebook!');
    console.log('Token expires in:', data.expires_in, 'seconds (approximately', Math.round(data.expires_in / 86400), 'days)');
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
    
    // Store the long-lived token in the database
    console.log('Storing long-lived token in database...');
    
    // First ensure the table exists
    const tableExists = await ensureFacebookTokensTable();
    if (!tableExists) {
      throw new Error('Facebook tokens table does not exist or could not be accessed.');
    }
    
    // Look up existing record for this user
    const { data: existingTokens, error: findError } = await client
      .from('user_facebook_tokens')
      .select('*')
      .eq('user_id', userId);
    
    if (findError) {
      console.error('Error finding existing token record:', findError);
      return { success: false, error: 'Database query error', details: findError };
    }
    
    let updateResult;
    
    if (existingTokens && existingTokens.length > 0) {
      // Update the existing record with the long-lived token
      const { data: updateData, error: updateError } = await client
        .from('user_facebook_tokens')
        .update({
          access_token: data.access_token,    // This is for the long-lived token
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();
      
      if (updateError) {
        console.error('Error updating token record with long-lived token:', updateError);
        return { success: false, error: 'Database update error', details: updateError };
      }
      
      updateResult = updateData;
      console.log('Successfully updated record with long-lived token');
    } else {
      // Create a new record if none exists (unlikely but possible)
      const { data: insertData, error: insertError } = await client
        .from('user_facebook_tokens')
        .insert({
          user_id: userId,
          access_token_shortlived: shortLivedToken,
          access_token: data.access_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting token record with long-lived token:', insertError);
        return { success: false, error: 'Database insert error', details: insertError };
      }
      
      updateResult = insertData;
      console.log('Successfully inserted new record with long-lived token');
    }
    
    console.log('==== FACEBOOK TOKEN EXCHANGE COMPLETED ====');
    
    return { 
      success: true, 
      data: {
        token_preview: data.access_token.substring(0, 10) + '...',
        expires_in: data.expires_in,
        expires_in_days: Math.round(data.expires_in / 86400),
        expires_at: expiresAt.toISOString(),
        database_record: updateResult
      }
    };
  } catch (error) {
    console.error('==== FACEBOOK TOKEN EXCHANGE FAILED ====');
    console.error('Error details:', error);
    
    return { 
      success: false, 
      error: error.message || 'Unknown error during token exchange',
      stack: error.stack
    };
  }
} 