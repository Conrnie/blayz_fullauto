import logging
import os
from typing import Dict, Any, List, Optional
import json
from datetime import datetime

from app.models_automation import (
    AutomationSetup, AutomationRun, AgentDecision, 
    AgentAction, OptimizationResult, PerformanceSnapshot
)
from app.services.connection_pool import db_pool

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    Service for database operations related to automation system
    Handles storing and retrieving automation data
    """
    
    def __init__(self):
        self.pool = db_pool  # Use the singleton connection pool
    
    async def save_automation_setup(self, setup: AutomationSetup) -> Optional[str]:
        """
        Save automation configuration
        
        Args:
            setup: AutomationSetup object
            
        Returns:
            Created automation setup ID
        """
        try:
            query = """
                INSERT INTO automation_setups 
                (id, user_id, campaign_id, campaign_name, company_profile_id, 
                 offer_id, automation_frequency, custom_settings, 
                 status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
                """
            
            result = await self.pool.fetchrow(
                    query,
                    setup.id,
                    setup.user_id,
                    setup.campaign_id,
                    setup.campaign_name,
                    setup.company_profile_id,
                    setup.offer_id,
                    setup.automation_frequency.value,
                    json.dumps(setup.custom_settings),
                    setup.status.value,
                    setup.created_at,
                    setup.updated_at
            )
            
            logger.info(f"Saved automation setup {setup.id}")
            return result['id']
                
        except Exception as e:
            logger.error(f"Failed to save automation setup: {str(e)}")
            return None
    
    async def get_automation_setup(self, automation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get automation setup by ID
        
        Args:
            automation_id: Automation setup ID
            
        Returns:
            Automation setup data or None
        """
        try:
            query = """
                SELECT * FROM automation_setups WHERE id = $1
                """
            result = await self.pool.fetchrow(query, automation_id)
                
            if result:
                data = dict(result)
                data['custom_settings'] = json.loads(data['custom_settings']) if data['custom_settings'] else {}
                return data
            return None
                
        except Exception as e:
            logger.error(f"Failed to get automation setup: {str(e)}")
            return None
    
    async def save_automation_run(self, run: AutomationRun) -> str:
        """
        Save automation run record
        
        Args:
            run: AutomationRun object
            
        Returns:
            Created automation run ID
        """
        try:
            query = """
                INSERT INTO automation_runs
                (id, automation_id, run_number, status, started_at, completed_at,
                 error_message, performance_before, performance_after, changes_summary)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
                """
            
            result = await self.pool.fetchrow(
                query,
                run.id,
                run.automation_id,
                run.run_number,
                run.status,
                run.started_at,
                run.completed_at,
                run.error_message,
                json.dumps(run.performance_before),
                json.dumps(run.performance_after),
                json.dumps(run.changes_summary)
            )
            
            logger.info(f"Saved automation run {run.id}")
            return result['id']
                
        except Exception as e:
            logger.error(f"Failed to save automation run: {str(e)}")
            raise
    
    async def save_agent_decision(self, decision: AgentDecision) -> str:
        """
        Save agent decision record
        
        Args:
            decision: AgentDecision object
            
        Returns:
            Created decision ID
        """
        try:
            query = """
                INSERT INTO agent_decisions
                (id, automation_run_id, agent_type, situation_analysis, 
                 identified_issues, identified_opportunities, decision_reasoning,
                 agents_to_activate, priority_score, confidence_score, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
                """
            
            result = await self.pool.fetchrow(
                    query,
                    decision.id,
                    decision.automation_run_id,
                    decision.agent_type.value,
                    json.dumps(decision.situation_analysis),
                    json.dumps(decision.identified_issues),
                    json.dumps(decision.identified_opportunities),
                    decision.decision_reasoning,
                    json.dumps([agent.value for agent in decision.agents_to_activate]),
                    decision.priority_score,
                    decision.confidence_score,
                    decision.timestamp
            )
            
            logger.info(f"Saved agent decision {decision.id}")
            return result['id']
                
        except Exception as e:
            logger.error(f"Failed to save agent decision: {str(e)}")
            raise
    
    async def save_agent_action(self, action: AgentAction) -> str:
        """
        Save agent action record
        
        Args:
            action: AgentAction object
            
        Returns:
            Created action ID
        """
        try:
            query = """
                INSERT INTO agent_actions
                (id, automation_run_id, agent_type, input_data, analysis_results,
                 action_type, action_details, execution_status, execution_result,
                 error_message, meta_api_calls, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
                """
            
            result = await self.pool.fetchrow(
                    query,
                    action.id,
                    action.automation_run_id,
                    action.agent_type.value,
                    json.dumps(action.input_data),
                    json.dumps(action.analysis_results),
                    action.action_type,
                    json.dumps(action.action_details),
                    action.execution_status,
                    json.dumps(action.execution_result),
                    action.error_message,
                    json.dumps(action.meta_api_calls),
                    action.timestamp
            )
            
            logger.info(f"Saved agent action {action.id}")
            return result['id']
                
        except Exception as e:
            logger.error(f"Failed to save agent action: {str(e)}")
            raise
    
    async def get_automation_history(self, automation_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get automation run history
        
        Args:
            automation_id: Automation setup ID
            limit: Number of recent runs to return
            
        Returns:
            List of automation run records
        """
        try:
            query = """
                SELECT * FROM automation_runs 
                WHERE automation_id = $1 
                ORDER BY started_at DESC 
                LIMIT $2
                """
            
            results = await self.pool.fetch(query, automation_id, limit)
                
            history = []
            for result in results:
                data = dict(result)
                data['performance_before'] = json.loads(data['performance_before']) if data['performance_before'] else {}
                data['performance_after'] = json.loads(data['performance_after']) if data['performance_after'] else {}
                data['changes_summary'] = json.loads(data['changes_summary']) if data['changes_summary'] else {}
                history.append(data)
            
            return history
                
        except Exception as e:
            logger.error(f"Failed to get automation history: {str(e)}")
            return []
    
    async def get_user_automations(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all automation setups for a user
        
        Args:
            user_id: User ID
            
        Returns:
            List of user's automation setups
        """
        try:
            query = """
                SELECT * FROM automation_setups 
                WHERE user_id = $1 
                ORDER BY created_at DESC
                """
            
            results = await self.pool.fetch(query, user_id)
            
            automations = []
            for result in results:
                data = dict(result)
                data['custom_settings'] = json.loads(data['custom_settings']) if data['custom_settings'] else {}
                automations.append(data)
            
            return automations
                
        except Exception as e:
            logger.error(f"Failed to get user automations: {str(e)}")
            return []