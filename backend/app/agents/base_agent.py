from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import uuid

from app.models_automation import AgentType, AgentAction

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Abstract base class for all AI agents in the system"""
    
    def __init__(self, agent_type: AgentType):
        self.agent_type = agent_type
        self.status = "idle"
        self.current_task = None
        self.last_run = None
        self.error_message = None
    
    @abstractmethod
    async def analyze(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze the input data and return insights
        
        Args:
            input_data: Data to analyze (campaign metrics, etc.)
            
        Returns:
            Analysis results dictionary
        """
        pass
    
    @abstractmethod
    async def decide(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make decisions based on analysis results
        
        Args:
            analysis_results: Results from the analyze method
            
        Returns:
            Decision details dictionary
        """
        pass
    
    @abstractmethod
    async def execute(self, decisions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the decisions (make API calls, generate content, etc.)
        
        Args:
            decisions: Decisions from the decide method
            
        Returns:
            Execution results dictionary
        """
        pass
    
    async def run(self, automation_run_id: str, input_data: Dict[str, Any]) -> AgentAction:
        """
        Main execution method that orchestrates analyze -> decide -> execute
        
        Args:
            automation_run_id: ID of the current automation run
            input_data: Input data for processing
            
        Returns:
            AgentAction record with complete results
        """
        action = AgentAction(
            automation_run_id=automation_run_id,
            agent_type=self.agent_type,
            input_data=input_data,
            action_type="pending"  # Default action type
        )
        
        try:
            self.status = "running"
            self.current_task = f"Processing automation run {automation_run_id}"
            self.last_run = datetime.now()
            
            logger.info(f"{self.agent_type.value} agent starting analysis")
            
            # Step 1: Analyze
            analysis_results = await self.analyze(input_data)
            action.analysis_results = analysis_results
            
            # Step 2: Decide
            decisions = await self.decide(analysis_results)
            action.action_details = decisions
            
            # Step 3: Execute (if there are actions to take)
            if decisions.get("should_execute", False):
                action.action_type = decisions.get("action_type", "no_action")
                execution_results = await self.execute(decisions)
                action.execution_result = execution_results
                action.execution_status = "completed"
            else:
                action.action_type = "no_action"
                action.execution_result = {"message": "No action required"}
                action.execution_status = "completed"
            
            self.status = "idle"
            self.current_task = None
            self.error_message = None
            
            logger.info(f"{self.agent_type.value} agent completed successfully")
            
        except Exception as e:
            logger.error(f"{self.agent_type.value} agent failed: {str(e)}")
            self.status = "error"
            self.error_message = str(e)
            action.execution_status = "failed"
            action.error_message = str(e)
        
        return action
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_type": self.agent_type.value,
            "status": self.status,
            "last_run": self.last_run,
            "current_task": self.current_task,
            "error_message": self.error_message
        }
    
    async def log_meta_api_call(self, method: str, endpoint: str, data: Dict[str, Any], response: Dict[str, Any]) -> Dict[str, Any]:
        """Helper to log Meta API calls made by the agent"""
        return {
            "timestamp": datetime.now().isoformat(),
            "method": method,
            "endpoint": endpoint,
            "request_data": data,
            "response": response
        }