-- SQL to create automation system tables in Supabase
-- Run this in your Supabase SQL editor

-- 1. Automation Setup Table
CREATE TABLE IF NOT EXISTS automation_setups (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    campaign_id VARCHAR NOT NULL,
    campaign_name VARCHAR NOT NULL,
    company_profile_id VARCHAR NOT NULL,
    strategy_id VARCHAR NOT NULL,
    offer_id VARCHAR NOT NULL,
    automation_frequency VARCHAR NOT NULL CHECK (automation_frequency IN ('every_6_hours', 'every_12_hours', 'daily', 'custom')),
    custom_settings JSONB DEFAULT '{}',
    status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Automation Runs Table
CREATE TABLE IF NOT EXISTS automation_runs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id VARCHAR NOT NULL REFERENCES automation_setups(id) ON DELETE CASCADE,
    run_number INTEGER NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    performance_before JSONB DEFAULT '{}',
    performance_after JSONB DEFAULT '{}',
    changes_summary JSONB DEFAULT '{}'
);

-- 3. Agent Decisions Table
CREATE TABLE IF NOT EXISTS agent_decisions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_run_id VARCHAR NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    agent_type VARCHAR NOT NULL CHECK (agent_type IN ('orchestrator', 'analytics', 'creative', 'copy', 'scaling')),
    situation_analysis JSONB DEFAULT '{}',
    identified_issues JSONB DEFAULT '[]',
    identified_opportunities JSONB DEFAULT '[]',
    decision_reasoning TEXT NOT NULL,
    agents_to_activate JSONB DEFAULT '[]',
    priority_score DECIMAL(3,2) DEFAULT 0.0,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Agent Actions Table
CREATE TABLE IF NOT EXISTS agent_actions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_run_id VARCHAR NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    agent_type VARCHAR NOT NULL CHECK (agent_type IN ('orchestrator', 'analytics', 'creative', 'copy', 'scaling')),
    input_data JSONB DEFAULT '{}',
    analysis_results JSONB DEFAULT '{}',
    action_type VARCHAR NOT NULL,
    action_details JSONB DEFAULT '{}',
    execution_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'completed', 'failed')),
    execution_result JSONB DEFAULT '{}',
    error_message TEXT,
    meta_api_calls JSONB DEFAULT '[]',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Optimization Results Table
CREATE TABLE IF NOT EXISTS optimization_results (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_run_id VARCHAR NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    change_type VARCHAR NOT NULL,
    change_details JSONB DEFAULT '{}',
    metrics_before JSONB DEFAULT '{}',
    metrics_after JSONB DEFAULT '{}',
    performance_delta JSONB DEFAULT '{}',
    is_successful BOOLEAN,
    success_criteria JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Performance Snapshots Table
CREATE TABLE IF NOT EXISTS performance_snapshots (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_run_id VARCHAR NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    campaign_id VARCHAR NOT NULL,
    spend DECIMAL(10,2) DEFAULT 0.0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0.0,
    cpc DECIMAL(8,2) DEFAULT 0.0,
    cpl DECIMAL(8,2) DEFAULT 0.0,
    frequency DECIMAL(3,1) DEFAULT 0.0,
    daily_budget DECIMAL(10,2) DEFAULT 0.0,
    budget_utilization DECIMAL(3,2) DEFAULT 0.0,
    active_ads_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_automation_setups_user_id ON automation_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_setups_status ON automation_setups(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation_id ON automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at ON automation_runs(started_at);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_automation_run_id ON agent_decisions(automation_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_automation_run_id ON agent_actions(automation_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_type ON agent_actions(agent_type);
CREATE INDEX IF NOT EXISTS idx_optimization_results_automation_run_id ON optimization_results(automation_run_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_automation_run_id ON performance_snapshots(automation_run_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_campaign_id ON performance_snapshots(campaign_id);

-- Enable RLS (Row Level Security) for multi-tenant access
ALTER TABLE automation_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own automation data)
CREATE POLICY "Users can only access their automation setups" ON automation_setups
    FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can only access their automation runs" ON automation_runs
    FOR ALL USING (
        automation_id IN (
            SELECT id FROM automation_setups WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can only access their agent decisions" ON agent_decisions
    FOR ALL USING (
        automation_run_id IN (
            SELECT r.id FROM automation_runs r
            JOIN automation_setups s ON r.automation_id = s.id
            WHERE s.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can only access their agent actions" ON agent_actions
    FOR ALL USING (
        automation_run_id IN (
            SELECT r.id FROM automation_runs r
            JOIN automation_setups s ON r.automation_id = s.id
            WHERE s.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can only access their optimization results" ON optimization_results
    FOR ALL USING (
        automation_run_id IN (
            SELECT r.id FROM automation_runs r
            JOIN automation_setups s ON r.automation_id = s.id
            WHERE s.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can only access their performance snapshots" ON performance_snapshots
    FOR ALL USING (
        automation_run_id IN (
            SELECT r.id FROM automation_runs r
            JOIN automation_setups s ON r.automation_id = s.id
            WHERE s.user_id = auth.uid()::text
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automation_setups
CREATE TRIGGER update_automation_setups_updated_at 
    BEFORE UPDATE ON automation_setups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();