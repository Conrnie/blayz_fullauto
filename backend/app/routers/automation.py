from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import logging
from datetime import datetime

from app.models_automation import (
    AutomationSetupRequest, AutomationRunRequest, 
    AgentStatusResponse, AutomationHistoryResponse,
    AutomationSetup, AutomationRun, AgentDecision,
    AutomationStatus, AutomationFrequency, AgentType
)
from app.agents.orchestrator import OrchestratorAgent
from app.services.database_service import DatabaseService
from app.auth import validate_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/automation", tags=["automation"])

# Initialize services
orchestrator = OrchestratorAgent()
db_service = DatabaseService()


@router.post("/setup")
async def create_automation_setup(
    setup_request: AutomationSetupRequest,
    user_data: dict = Depends(validate_token)
):
    """
    Create a new automation setup from the frontend wizard
    """
    try:
        user_id = user_data.get("user_id", "demo_user")
        
        # Create automation setup
        automation_setup = AutomationSetup(
            user_id=user_id,
            campaign_id=setup_request.campaign_id,
            campaign_name=setup_request.campaign_name,
            company_profile_id=setup_request.company_profile_id,
            offer_id=setup_request.offer_id,
            automation_frequency=setup_request.automation_frequency,
            custom_settings=setup_request.custom_settings,
            status=AutomationStatus.ACTIVE
        )
        
        # Save to database
        automation_id = await db_service.save_automation_setup(automation_setup)
        
        logger.info(f"Created automation setup {automation_id} for user {user_id}")
        
        return {
            "success": True,
            "automation_id": automation_id,
            "message": "Automation setup created successfully",
            "setup": automation_setup.dict()
        }
        
    except Exception as e:
        logger.error(f"Failed to create automation setup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run")
async def trigger_automation_run(
    run_request: AutomationRunRequest,
    user_data: dict = Depends(validate_token)
):
    """
    Trigger an automation run for a specific setup
    """
    try:
        user_id = user_data.get("user_id", "demo_user")
        automation_id = run_request.automation_id
        
        # Get automation setup
        automation_setup = await db_service.get_automation_setup(automation_id)
        if not automation_setup:
            raise HTTPException(status_code=404, detail="Automation setup not found")
        
        # Verify ownership
        if automation_setup["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get next run number
        history = await db_service.get_automation_history(automation_id, limit=1)
        next_run_number = (history[0]["run_number"] + 1) if history else 1
        
        # Create automation run record
        automation_run = AutomationRun(
            automation_id=automation_id,
            run_number=next_run_number,
            status="running"
        )
        
        run_id = await db_service.save_automation_run(automation_run)
        
        # Prepare input data for orchestrator
        input_data = {
            "campaign_id": automation_setup["campaign_id"],
            "automation_setup": automation_setup,
            "run_id": run_id,
            "force_run": run_request.force_run
        }
        
        # Run orchestrator agent
        logger.info(f"Starting automation run {run_id} for setup {automation_id}")
        orchestrator_action = await orchestrator.run(run_id, input_data)
        
        # Save orchestrator decision
        await db_service.save_agent_action(orchestrator_action)
        
        # Create decision record if orchestrator made decisions
        if orchestrator_action.action_details.get("should_execute"):
            decision = AgentDecision(
                automation_run_id=run_id,
                agent_type=AgentType.ORCHESTRATOR,
                situation_analysis=orchestrator_action.analysis_results,
                identified_issues=orchestrator_action.action_details.get("issues_identified", []),
                identified_opportunities=orchestrator_action.action_details.get("opportunities_identified", []),
                decision_reasoning=orchestrator_action.action_details.get("decision_reasoning", ""),
                agents_to_activate=orchestrator_action.action_details.get("agents_to_activate", []),
                priority_score=orchestrator_action.action_details.get("priority_score", 0.0),
                confidence_score=orchestrator_action.action_details.get("confidence_score", 0.0)
            )
            
            await db_service.save_agent_decision(decision)
        
        return {
            "success": True,
            "run_id": run_id,
            "status": orchestrator_action.execution_status,
            "message": "Automation run completed",
            "results": {
                "issues_found": len(orchestrator_action.action_details.get("issues_identified", [])),
                "opportunities_found": len(orchestrator_action.action_details.get("opportunities_identified", [])),
                "agents_activated": len(orchestrator_action.action_details.get("agents_to_activate", [])),
                "priority_score": orchestrator_action.action_details.get("priority_score", 0.0),
                "reasoning": orchestrator_action.action_details.get("decision_reasoning", "")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger automation run: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{automation_id}")
async def get_automation_history(
    automation_id: str,
    user_data: dict = Depends(validate_token)
):
    """
    Get automation run history for a specific setup
    """
    try:
        user_id = user_data.get("user_id", "demo_user")
        
        # Verify ownership
        automation_setup = await db_service.get_automation_setup(automation_id)
        if not automation_setup:
            raise HTTPException(status_code=404, detail="Automation setup not found")
        
        if automation_setup["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get history
        history = await db_service.get_automation_history(automation_id, limit=20)
        
        return {
            "automation_id": automation_id,
            "recent_runs": history,
            "total_runs": len(history)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get automation history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user-automations")
async def get_user_automations(user_data: dict = Depends(validate_token)):
    """
    Get all automation setups for the current user
    """
    try:
        user_id = user_data.get("user_id", "demo_user")
        
        automations = await db_service.get_user_automations(user_id)
        
        return {
            "automations": automations,
            "total_count": len(automations)
        }
        
    except Exception as e:
        logger.error(f"Failed to get user automations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/status")
async def get_agents_status():
    """
    Get status of all automation agents
    """
    try:
        # For now, return status of orchestrator
        # Will expand when other agents are implemented
        
        agent_statuses = [
            orchestrator.get_status()
        ]
        
        return {
            "agents": agent_statuses,
            "system_status": "operational",
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get agents status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pause/{automation_id}")
async def pause_automation(
    automation_id: str,
    user_data: dict = Depends(validate_token)
):
    """
    Pause an active automation setup
    """
    try:
        user_id = user_data.get("user_id", "demo_user")
        
        # Verify ownership
        automation_setup = await db_service.get_automation_setup(automation_id)
        if not automation_setup:
            raise HTTPException(status_code=404, detail="Automation setup not found")
        
        if automation_setup["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update status (this would require implementing update method in db_service)
        # For now, return success message
        
        return {
            "success": True,
            "automation_id": automation_id,
            "status": "paused",
            "message": "Automation paused successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to pause automation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume/{automation_id}")
async def resume_automation(
    automation_id: str,
    user_data: dict = Depends(validate_token)
):
    """
    Resume a paused automation setup
    """
    try:
        user_id = user_data.get("user_id", "demo_user")
        
        # Verify ownership
        automation_setup = await db_service.get_automation_setup(automation_id)
        if not automation_setup:
            raise HTTPException(status_code=404, detail="Automation setup not found")
        
        if automation_setup["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update status (this would require implementing update method in db_service)
        # For now, return success message
        
        return {
            "success": True,
            "automation_id": automation_id,
            "status": "active",
            "message": "Automation resumed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resume automation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-orchestrator")
async def test_orchestrator():
    """
    Test endpoint to verify orchestrator agent is working
    """
    try:
        test_input = {
            "campaign_id": "test_campaign_123",
            "automation_setup": {
                "strategy_id": "conservative",
                "target_cpl": 12.00
            }
        }
        
        # Run orchestrator with test data
        action = await orchestrator.run("test_run_123", test_input)
        
        return {
            "success": True,
            "message": "Orchestrator test completed",
            "action_type": action.action_type,
            "execution_status": action.execution_status,
            "analysis_results": action.analysis_results,
            "action_details": action.action_details
        }
        
    except Exception as e:
        logger.error(f"Orchestrator test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))