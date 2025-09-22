const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zrsevaevonthrspehpaj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyc2V2YWV2b250aHJzcGVocGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NzAyOTcsImV4cCI6MjA1NzM0NjI5N30.KqKjrspzqP0aAmL-zIRbrFpyy9t04rL_R4XokBZP3Qg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAssistants() {
  try {
    console.log('Checking assistants in database...');
    
    const { data: assistants, error } = await supabase
      .from('ai_assistants')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error fetching assistants:', error);
      return;
    }
    
    console.log('Found assistants:', assistants?.length || 0);
    
    if (assistants && assistants.length > 0) {
      console.log('First assistant structure:');
      console.log(JSON.stringify(assistants[0], null, 2));
      
      // Check model_config structure
      if (assistants[0].model_config) {
        console.log('\nModel config structure:');
        console.log(JSON.stringify(assistants[0].model_config, null, 2));
      }
    } else {
      console.log('No assistants found in database');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkAssistants();