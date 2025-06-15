"""
Website Generation Workflow
Main LangGraph workflow that orchestrates all agents for complete website generation
"""

from langgraph.graph import StateGraph, END
from typing import Dict, Any, List
import asyncio
from datetime import datetime

from .base import BaseWorkflow, WorkflowState, WorkflowStatus, register_workflow
from .agents.requirements_analyzer import RequirementsAnalyzer
from .agents.content_generator import ContentGenerator
from .agents.seo_optimizer import SEOOptimizer
from .agents.structure_planner import StructurePlanner
from ..services.ollama_client import OllamaClient

@register_workflow("website_generation")
class WebsiteGenerationWorkflow(BaseWorkflow):
    """Complete website generation workflow using LangGraph"""
    
    def __init__(self, ollama_client: OllamaClient, config: Dict[str, Any] = None):
        super().__init__(ollama_client, config)
        
        # Initialize specialized agents
        self.requirements_analyzer = RequirementsAnalyzer(ollama_client)
        self.content_generator = ContentGenerator(ollama_client)
        self.seo_optimizer = SEOOptimizer(ollama_client)
        self.structure_planner = StructurePlanner(ollama_client)
        
        # Workflow configuration
        self.config = config or {}
        self.parallel_execution = self.config.get("parallel_execution", False)
        self.skip_on_errors = self.config.get("skip_on_errors", False)
        
        self.logger.info("Initialized WebsiteGenerationWorkflow with all agents")
    
    async def setup_graph(self) -> StateGraph:
        """Setup the LangGraph workflow with all agent nodes"""
        
        # Create the state graph
        workflow = StateGraph(WorkflowState)
        
        # Add agent nodes
        workflow.add_node("analyze_requirements", self._analyze_requirements_node)
        workflow.add_node("generate_content", self._generate_content_node)
        workflow.add_node("optimize_seo", self._optimize_seo_node)
        workflow.add_node("plan_structure", self._plan_structure_node)
        workflow.add_node("finalize_output", self._finalize_output_node)
        workflow.add_node("handle_error", self._handle_error_node)
        
        # Define the workflow edges (execution order)
        workflow.set_entry_point("analyze_requirements")
        
        # Sequential execution with error handling
        workflow.add_conditional_edges(
            "analyze_requirements",
            self._should_continue_after_requirements,
            {
                "continue": "generate_content",
                "error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "generate_content",
            self._should_continue_after_content,
            {
                "continue": "optimize_seo",
                "error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "optimize_seo",
            self._should_continue_after_seo,
            {
                "continue": "plan_structure",
                "error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "plan_structure",
            self._should_continue_after_structure,
            {
                "continue": "finalize_output",
                "error": "handle_error"
            }
        )
        
        workflow.add_edge("finalize_output", END)
        workflow.add_edge("handle_error", END)
        
        # Compile the graph
        compiled_graph = workflow.compile()
        
        self.logger.info("LangGraph workflow compiled successfully")
        return compiled_graph
    
    # Conditional edge functions
    def _should_continue_after_requirements(self, state: WorkflowState) -> str:
        """Check if workflow should continue after requirements analysis"""
        if state.errors and not self.skip_on_errors:
            return "error"
        if not state.metadata.get("content_strategy"):
            state.add_error("Requirements analysis failed to generate content strategy")
            return "error"
        return "continue"
    
    def _should_continue_after_content(self, state: WorkflowState) -> str:
        """Check if workflow should continue after content generation"""
        if state.errors and not self.skip_on_errors:
            return "error"
        if not state.generated_content:
            state.add_error("Content generation failed to produce content")
            return "error"
        return "continue"
    
    def _should_continue_after_seo(self, state: WorkflowState) -> str:
        """Check if workflow should continue after SEO optimization"""
        if state.errors and not self.skip_on_errors:
            return "error"
        # SEO is optional, continue even if it fails
        return "continue"
    
    def _should_continue_after_structure(self, state: WorkflowState) -> str:
        """Check if workflow should continue after structure planning"""
        if state.errors and not self.skip_on_errors:
            return "error"
        return "continue"
    
    # Agent node wrapper functions
    async def _analyze_requirements_node(self, state: WorkflowState) -> WorkflowState:
        """Node wrapper for requirements analysis"""
        try:
            self.logger.info(
                "Executing requirements analysis",
                workflow_id=state.workflow_id,
                step="analyze_requirements"
            )
            
            state.update_progress("Analyzing requirements", 10.0, WorkflowStatus.RUNNING)
            
            # Execute requirements analyzer
            result = await self.requirements_analyzer.safe_execute(state)
            
            # Additional validation
            if result.metadata.get("content_strategy"):
                strategy = result.metadata["content_strategy"]
                
                # Validate strategy completeness
                required_keys = ["target_audience", "content_goals", "seo_keywords"]
                missing_keys = [key for key in required_keys if not strategy.get(key)]
                
                if missing_keys:
                    result.add_warning(f"Content strategy missing: {', '.join(missing_keys)}")
                else:
                    self.logger.info(
                        "Requirements analysis completed successfully",
                        workflow_id=result.workflow_id,
                        keywords_count=len(strategy.get("seo_keywords", {}).get("primary", [])),
                        goals_count=len(strategy.get("content_goals", []))
                    )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Requirements analysis node failed: {str(e)}")
            state.add_error(f"Requirements analysis failed: {str(e)}")
            return state
    
    async def _generate_content_node(self, state: WorkflowState) -> WorkflowState:
        """Node wrapper for content generation"""
        try:
            self.logger.info(
                "Executing content generation",
                workflow_id=state.workflow_id,
                step="generate_content"
            )
            
            state.update_progress("Generating website content", 30.0)
            
            # Execute content generator
            result = await self.content_generator.safe_execute(state)
            
            # Validate generated content
            if result.generated_content:
                content_keys = list(result.generated_content.keys())
                self.logger.info(
                    "Content generation completed successfully",
                    workflow_id=result.workflow_id,
                    content_sections=content_keys,
                    total_sections=len(content_keys)
                )
                
                # Check for essential content
                essential_content = ["homepage"]
                missing_essential = [key for key in essential_content if key not in content_keys]
                if missing_essential:
                    result.add_warning(f"Missing essential content: {', '.join(missing_essential)}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Content generation node failed: {str(e)}")
            state.add_error(f"Content generation failed: {str(e)}")
            return state
    
    async def _optimize_seo_node(self, state: WorkflowState) -> WorkflowState:
        """Node wrapper for SEO optimization"""
        try:
            self.logger.info(
                "Executing SEO optimization",
                workflow_id=state.workflow_id,
                step="optimize_seo"
            )
            
            state.update_progress("Optimizing for SEO", 65.0)
            
            # Execute SEO optimizer
            result = await self.seo_optimizer.safe_execute(state)
            
            # Validate SEO optimization
            seo_data = result.metadata.get("seo_optimization", {})
            if seo_data:
                self.logger.info(
                    "SEO optimization completed successfully",
                    workflow_id=result.workflow_id,
                    pages_optimized=len(seo_data),
                    has_structured_data=bool(result.metadata.get("structured_data"))
                )
            else:
                result.add_warning("SEO optimization produced no results")
            
            return result
            
        except Exception as e:
            self.logger.error(f"SEO optimization node failed: {str(e)}")
            state.add_error(f"SEO optimization failed: {str(e)}")
            return state
    
    async def _plan_structure_node(self, state: WorkflowState) -> WorkflowState:
        """Node wrapper for structure planning"""
        try:
            self.logger.info(
                "Executing structure planning",
                workflow_id=state.workflow_id,
                step="plan_structure"
            )
            
            state.update_progress("Planning site structure", 85.0)
            
            # Execute structure planner
            result = await self.structure_planner.safe_execute(state)
            
            # Validate structure planning
            site_structure = result.metadata.get("site_structure", {})
            navigation = result.metadata.get("navigation", {})
            
            if site_structure and navigation:
                self.logger.info(
                    "Structure planning completed successfully",
                    workflow_id=result.workflow_id,
                    structure_type=site_structure.get("type"),
                    total_pages=site_structure.get("total_pages", site_structure.get("total_sections", 0)),
                    navigation_items=len(navigation.get("main_menu", []))
                )
            else:
                result.add_warning("Structure planning incomplete")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Structure planning node failed: {str(e)}")
            state.add_error(f"Structure planning failed: {str(e)}")
            return state
    
    async def _finalize_output_node(self, state: WorkflowState) -> WorkflowState:
        """Finalize and package the output"""
        try:
            self.logger.info(
                "Finalizing workflow output",
                workflow_id=state.workflow_id,
                step="finalize_output"
            )
            
            state.update_progress("Finalizing output", 98.0)
            
            # Package all generated data
            final_output = {
                "metadata": {
                    "workflow_id": state.workflow_id,
                    "generated_at": datetime.utcnow().isoformat(),
                    "workflow_version": "1.0.0",
                    "agents_used": [
                        "RequirementsAnalyzer",
                        "ContentGenerator", 
                        "SEOOptimizer",
                        "StructurePlanner"
                    ]
                },
                "content": state.generated_content or {},
                "seo": state.metadata.get("seo_optimization", {}),
                "structure": state.metadata.get("site_structure", {}),
                "navigation": state.metadata.get("navigation", {}),
                "url_structure": state.metadata.get("url_structure", {}),
                "structured_data": state.metadata.get("structured_data", {}),
                "strategy": state.metadata.get("content_strategy", {}),
                "page_hierarchy": state.metadata.get("page_hierarchy", {}),
                "footer_structure": state.metadata.get("footer_structure", {}),
                "seo_recommendations": state.metadata.get("seo_recommendations", []),
                "sitemap_structure": state.metadata.get("sitemap_structure", {})
            }
            
            # Quality validation
            validation_results = await self._validate_final_output(final_output, state)
            final_output["validation"] = validation_results
            
            # Check for completeness
            required_sections = ["content", "structure", "navigation"]
            missing_sections = [section for section in required_sections 
                              if not final_output.get(section)]
            
            if missing_sections:
                state.add_error(f"Missing required sections: {', '.join(missing_sections)}")
                state.status = WorkflowStatus.FAILED
            else:
                # Success
                state.metadata["final_output"] = final_output
                state.update_progress("Website generation completed", 100.0, WorkflowStatus.COMPLETED)
                
                self.logger.info(
                    "Website generation workflow completed successfully",
                    workflow_id=state.workflow_id,
                    output_sections=list(final_output.keys()),
                    validation_score=validation_results.get("overall_score", 0),
                    total_errors=len(state.errors),
                    total_warnings=len(state.warnings)
                )
            
            return state
            
        except Exception as e:
            self.logger.error(f"Output finalization failed: {str(e)}")
            state.add_error(f"Output finalization failed: {str(e)}")
            state.status = WorkflowStatus.FAILED
            return state
    
    async def _handle_error_node(self, state: WorkflowState) -> WorkflowState:
        """Handle workflow errors and provide recovery options"""
        
        self.logger.error(
            "Workflow error handling activated",
            workflow_id=state.workflow_id,
            errors=state.errors,
            current_step=state.current_step
        )
        
        state.status = WorkflowStatus.FAILED
        
        # Try to provide partial results if possible
        if state.generated_content or state.metadata:
            partial_output = {
                "partial": True,
                "completed_steps": [],
                "content": state.generated_content,
                "metadata": {k: v for k, v in state.metadata.items() if v},
                "errors": state.errors,
                "warnings": state.warnings
            }
            
            # Determine which steps completed successfully
            if state.metadata.get("content_strategy"):
                partial_output["completed_steps"].append("requirements_analysis")
            if state.generated_content:
                partial_output["completed_steps"].append("content_generation")
            if state.metadata.get("seo_optimization"):
                partial_output["completed_steps"].append("seo_optimization")
            if state.metadata.get("site_structure"):
                partial_output["completed_steps"].append("structure_planning")
            
            state.metadata["partial_output"] = partial_output
            
            self.logger.info(
                "Partial results preserved",
                workflow_id=state.workflow_id,
                completed_steps=partial_output["completed_steps"]
            )
        
        return state
    
    async def _validate_final_output(self, final_output: Dict[str, Any], state: WorkflowState) -> Dict[str, Any]:
        """Validate the final output quality and completeness"""
        
        validation = {
            "overall_score": 0,
            "content_quality": 0,
            "seo_completeness": 0,
            "structure_validity": 0,
            "issues": [],
            "recommendations": []
        }
        
        try:
            # Content validation
            content = final_output.get("content", {})
            if content:
                content_score = 0
                
                # Check for essential content
                if content.get("homepage"):
                    content_score += 40
                if content.get("about"):
                    content_score += 20
                if content.get("services"):
                    content_score += 20
                if content.get("contact"):
                    content_score += 20
                
                validation["content_quality"] = content_score
                
                if content_score < 60:
                    validation["issues"].append("Missing essential content sections")
            
            # SEO validation
            seo = final_output.get("seo", {})
            if seo:
                seo_score = 0
                
                # Check SEO elements
                if seo.get("homepage", {}).get("title"):
                    seo_score += 25
                if seo.get("homepage", {}).get("meta_description"):
                    seo_score += 25
                if final_output.get("structured_data"):
                    seo_score += 25
                if final_output.get("sitemap_structure"):
                    seo_score += 25
                
                validation["seo_completeness"] = seo_score
                
                if seo_score < 50:
                    validation["issues"].append("Incomplete SEO optimization")
            
            # Structure validation
            structure = final_output.get("structure", {})
            navigation = final_output.get("navigation", {})
            
            if structure and navigation:
                structure_score = 0
                
                # Check structure elements
                if structure.get("type"):
                    structure_score += 25
                if structure.get("pages") or structure.get("sections"):
                    structure_score += 25
                if navigation.get("main_menu"):
                    structure_score += 25
                if final_output.get("url_structure"):
                    structure_score += 25
                
                validation["structure_validity"] = structure_score
                
                if structure_score < 75:
                    validation["issues"].append("Incomplete site structure")
            
            # Calculate overall score
            scores = [
                validation["content_quality"],
                validation["seo_completeness"], 
                validation["structure_validity"]
            ]
            validation["overall_score"] = sum(scores) // len(scores)
            
            # Add recommendations based on score
            if validation["overall_score"] < 70:
                validation["recommendations"].append("Review and enhance content quality")
            if validation["seo_completeness"] < 80:
                validation["recommendations"].append("Complete SEO optimization")
            if validation["structure_validity"] < 80:
                validation["recommendations"].append("Refine site structure and navigation")
            
        except Exception as e:
            validation["issues"].append(f"Validation error: {str(e)}")
        
        return validation
    
    async def get_workflow_status(self) -> Dict[str, Any]:
        """Get current workflow status and progress"""
        
        if not self.state:
            return {"status": "not_started"}
        
        return {
            "workflow_id": self.state.workflow_id,
            "status": self.state.status.value,
            "progress": self.state.progress,
            "current_step": self.state.current_step,
            "errors": self.state.errors,
            "warnings": self.state.warnings,
            "started_at": self.state.started_at.isoformat() if self.state.started_at else None,
            "last_updated": self.state.last_updated.isoformat() if self.state.last_updated else None,
            "agent_results": {
                agent: result.get("success", False) 
                for agent, result in self.state.agent_results.items()
            }
        }
