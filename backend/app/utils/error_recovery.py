"""
Error recovery and resilience utilities for the automation system
"""
import logging
import asyncio
from typing import Any, Callable, Optional, TypeVar, Union, Dict
from functools import wraps
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RecoveryError(Exception):
    """Custom exception for recovery failures"""
    pass


class CircuitBreaker:
    """Circuit breaker pattern for fault tolerance"""
    
    def __init__(self, 
                 failure_threshold: int = 5, 
                 recovery_timeout: int = 60,
                 expected_exception: type = Exception):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half_open
    
    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function with circuit breaker protection"""
        if self.state == "open":
            if self._should_attempt_reset():
                self.state = "half_open"
            else:
                raise RecoveryError(f"Circuit breaker is open. Service unavailable.")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    async def async_call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute async function with circuit breaker protection"""
        if self.state == "open":
            if self._should_attempt_reset():
                self.state = "half_open"
            else:
                raise RecoveryError(f"Circuit breaker is open. Service unavailable.")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        """Handle successful call"""
        self.failure_count = 0
        self.state = "closed"
    
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset"""
        if self.last_failure_time:
            elapsed = datetime.utcnow() - self.last_failure_time
            return elapsed.total_seconds() >= self.recovery_timeout
        return False


def with_retry(max_attempts: int = 3, 
               delay: float = 1.0, 
               exponential_backoff: bool = True,
               exceptions: tuple = (Exception,)):
    """Decorator for automatic retry with exponential backoff"""
    
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        wait_time = delay * (2 ** attempt if exponential_backoff else 1)
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}. "
                            f"Retrying in {wait_time}s... Error: {str(e)}"
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"All {max_attempts} attempts failed for {func.__name__}")
            
            raise last_exception
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None
            import time
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        wait_time = delay * (2 ** attempt if exponential_backoff else 1)
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}. "
                            f"Retrying in {wait_time}s... Error: {str(e)}"
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(f"All {max_attempts} attempts failed for {func.__name__}")
            
            raise last_exception
        
        # Return appropriate wrapper
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class Fallback:
    """Fallback handler for graceful degradation"""
    
    def __init__(self, primary_func: Callable, fallback_func: Callable):
        self.primary_func = primary_func
        self.fallback_func = fallback_func
    
    async def execute(self, *args, **kwargs) -> Any:
        """Execute with fallback on failure"""
        try:
            if asyncio.iscoroutinefunction(self.primary_func):
                return await self.primary_func(*args, **kwargs)
            else:
                return self.primary_func(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Primary function failed, using fallback: {str(e)}")
            
            if asyncio.iscoroutinefunction(self.fallback_func):
                return await self.fallback_func(*args, **kwargs)
            else:
                return self.fallback_func(*args, **kwargs)


class HealthCheck:
    """Health check monitor for services"""
    
    def __init__(self, check_interval: int = 30):
        self.check_interval = check_interval
        self.services = {}
        self.last_check = {}
    
    def register_service(self, name: str, health_check_func: Callable[[], bool]):
        """Register a service health check"""
        self.services[name] = health_check_func
        self.last_check[name] = None
    
    async def check_health(self, service_name: str = None) -> Dict[str, bool]:
        """Check health of services"""
        if service_name:
            services_to_check = {service_name: self.services.get(service_name)}
        else:
            services_to_check = self.services
        
        health_status = {}
        
        for name, check_func in services_to_check.items():
            if check_func:
                try:
                    if asyncio.iscoroutinefunction(check_func):
                        health_status[name] = await check_func()
                    else:
                        health_status[name] = check_func()
                    self.last_check[name] = datetime.utcnow()
                except Exception as e:
                    logger.error(f"Health check failed for {name}: {str(e)}")
                    health_status[name] = False
        
        return health_status
    
    def get_last_check_time(self, service_name: str) -> Optional[datetime]:
        """Get last health check time for a service"""
        return self.last_check.get(service_name)