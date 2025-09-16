const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zrsevaevonthrspehpaj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyc2V2YWV2b250aHJzcGVocGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NzAyOTcsImV4cCI6MjA1NzM0NjI5N30.KqKjrspzqP0aAmL-zIRbrFpyy9t04rL_R4XokBZP3Qg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestAssistant() {
  try {
    console.log('Creating test assistant...');
    
    const testAssistant = {
      user_id: '00000000-0000-0000-0000-000000000000', // placeholder user ID
      name: 'Test Campaign Assistant',
      description: 'Campaign Optimization Specialist for Meta Ads',
      system_prompt: 'You are a helpful AI assistant specialized in Meta Ads campaign optimization.',
      model_config: {
        campaign_name: 'Test Campaign',
        companyProfile: {
          company_name: 'Test Company',
          industry: 'E-commerce',
          description: 'A test company for demonstration purposes',
          target_market: 'Young adults aged 18-35'
        },
        avatar: {
          personality: 'Professional and helpful',
          communication_style: 'Clear and actionable'
        },
        objectives: {
          primary_goal: 'Increase conversions',
          secondary_goals: ['Reduce cost per acquisition', 'Improve ad relevance']
        }
      },
      is_active: true
    };
    
    const { data, error } = await supabase
      .from('ai_assistants')
      .insert([testAssistant])
      .select();
    
    if (error) {
      console.error('Error creating assistant:', error);
      return;
    }
    
    console.log('Test assistant created successfully:');
    console.log(JSON.stringify(data[0], null, 2));
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestAssistant();