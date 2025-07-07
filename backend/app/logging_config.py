import logging
import os
import traceback
from supabase import create_client, Client
from datetime import datetime

# Initialize Supabase client for logging
# This should ideally use the same environment variables as the rest of your app
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") # Use service key for logging

supabase_logger_client: Client = None
if supabase_url and supabase_key:
    try:
        supabase_logger_client = create_client(supabase_url, supabase_key)
        # print("Supabase logger client initialized.") # For debugging initialization
    except Exception as e:
        print(f"Failed to initialize Supabase client for logging: {e}")
else:
    print("Supabase URL or Service Key not found for logger client. Supabase logging will be disabled.")


class SupabaseLogHandler(logging.Handler):
    def __init__(self, supabase_client: Client):
        super().__init__()
        self.supabase_client = supabase_client

    def emit(self, record: logging.LogRecord):
        if not self.supabase_client:
            # Fallback to console if Supabase client isn't available
            print(f"Supabase client not available. Log record: {self.format(record)}")
            return

        try:
            log_entry = {
                "service": getattr(record, "service", "fastapi_backend"), # Allow 'service' to be passed in extra
                "event_type": getattr(record, "event_type", "generic_log"), # Allow 'event_type' to be passed in extra
                "user_id": getattr(record, "user_id", None), # Allow 'user_id' to be passed in extra
                "source_ip": getattr(record, "source_ip", None), # Allow 'source_ip' to be passed in extra
                "details": {
                    "message": record.getMessage(),
                    "level": record.levelname,
                    "module": record.module,
                    "funcName": record.funcName,
                    "lineno": record.lineno,
                },
                "severity": record.levelname,
                # Ensure timestamp is explicitly set if 'timestamp' is not part of the record extras
                "timestamp": getattr(record, "timestamp", datetime.utcnow().isoformat())
            }
            
            # If there's exception information, add it to details
            if record.exc_info:
                log_entry["details"]["exception"] = "".join(
                    traceback.format_exception(*record.exc_info)
                )
            
            # Include any other extra fields passed to the logger
            if hasattr(record, 'custom_extra') and isinstance(record.custom_extra, dict):
                log_entry["details"].update(record.custom_extra)


            response = self.supabase_client.table("security_logs").insert(log_entry).execute()
            if response.data is None and response.error: # Check for actual Supabase error
                 print(f"Failed to insert log into Supabase: {response.error}")
                 print(f"Log entry that failed: {log_entry}") # Print the problematic log
            # else:
            #    print(f"Successfully logged to Supabase: {log_entry['event_type']}") # For debugging successful logs

        except Exception as e:
            # Fallback to printing to console if Supabase logging fails
            print(f"Error logging to Supabase: {e}")
            print(f"Original log record: {self.format(record)}")


def setup_logging():
    logger = logging.getLogger() # Get root logger
    logger.setLevel(logging.INFO) # Set default logging level for application logs

    # Configure httpx and httpcore loggers to be less verbose
    # to avoid recursion with SupabaseLogHandler
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # Console Handler (optional, good for development)
    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(console_formatter)
    # logger.addHandler(console_handler) # Uncomment to see logs in console

    # Supabase Handler
    if supabase_logger_client:
        supabase_handler = SupabaseLogHandler(supabase_client=supabase_logger_client)
        supabase_handler.setLevel(logging.INFO) # Or your desired level for Supabase logs
        supabase_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s') # Basic formatter
        supabase_handler.setFormatter(supabase_formatter) # Formatter might not be strictly needed if emit structures everything
        logger.addHandler(supabase_handler)
        # print("Supabase log handler added.") # For debugging setup
    else:
        print("Supabase logging is disabled as the client could not be initialized.")

    # Test log
    # logging.getLogger("setup_logging_test").info("Logging setup complete.", extra={"event_type": "logging_init"}) 