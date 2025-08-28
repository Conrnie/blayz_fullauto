"""
Monitoring and logging utilities for the automation system
"""
import logging
import time
import json
from datetime import datetime
from functools import wraps
from typing import Any, Dict, Optional

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


class AutomationLogger:
    """Enhanced logger for automation system with structured logging"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.context = {}
    
    def set_context(self, **kwargs):
        """Set persistent context for all log messages"""
        self.context.update(kwargs)
    
    def clear_context(self):
        """Clear the logging context"""
        self.context = {}
    
    def _format_message(self, message: str, extra: Dict[str, Any] = None) -> str:
        """Format message with context and extra data"""
        data = {**self.context}
        if extra:
            data.update(extra)
        
        if data:
            return f"{message} | {json.dumps(data, default=str)}"
        return message
    
    def info(self, message: str, **kwargs):
        """Log info with context"""
        self.logger.info(self._format_message(message, kwargs))
    
    def warning(self, message: str, **kwargs):
        """Log warning with context"""
        self.logger.warning(self._format_message(message, kwargs))
    
    def error(self, message: str, **kwargs):
        """Log error with context"""
        self.logger.error(self._format_message(message, kwargs))
    
    def debug(self, message: str, **kwargs):
        """Log debug with context"""
        self.logger.debug(self._format_message(message, kwargs))


def log_execution_time(func):
    """Decorator to log function execution time"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        logger = AutomationLogger(func.__module__)
        
        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(
                f"{func.__name__} completed",
                execution_time=f"{execution_time:.2f}s",
                status="success"
            )
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"{func.__name__} failed",
                execution_time=f"{execution_time:.2f}s",
                status="error",
                error=str(e)
            )
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        logger = AutomationLogger(func.__module__)
        
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(
                f"{func.__name__} completed",
                execution_time=f"{execution_time:.2f}s",
                status="success"
            )
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"{func.__name__} failed",
                execution_time=f"{execution_time:.2f}s",
                status="error",
                error=str(e)
            )
            raise
    
    # Return appropriate wrapper based on function type
    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


class MetricsCollector:
    """Collect and track performance metrics"""
    
    def __init__(self):
        self.metrics = {}
        self.logger = AutomationLogger("metrics")
    
    def record_metric(self, name: str, value: float, tags: Dict[str, str] = None):
        """Record a metric value"""
        timestamp = datetime.utcnow().isoformat()
        
        if name not in self.metrics:
            self.metrics[name] = []
        
        metric_data = {
            "timestamp": timestamp,
            "value": value,
            "tags": tags or {}
        }
        
        self.metrics[name].append(metric_data)
        self.logger.debug(f"Metric recorded: {name}", value=value, tags=tags)
    
    def get_metrics(self, name: str = None) -> Dict[str, Any]:
        """Get collected metrics"""
        if name:
            return self.metrics.get(name, [])
        return self.metrics
    
    def clear_metrics(self, name: str = None):
        """Clear metrics"""
        if name:
            if name in self.metrics:
                del self.metrics[name]
        else:
            self.metrics = {}


# Global metrics collector instance
metrics = MetricsCollector()