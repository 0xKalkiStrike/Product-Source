from datetime import datetime, timedelta, timezone

class RetryEngine:
    """
    Calculates controlled exponential backoff delay and determines if a failed job should be retried.
    """
    def __init__(self, base_delay_seconds: int = 5, max_delay_seconds: int = 300):
        self.base_delay_seconds = base_delay_seconds
        self.max_delay_seconds = max_delay_seconds

    def should_retry(self, retry_count: int, max_retries: int, error_message: str = None) -> bool:
        if retry_count >= max_retries:
            return False
        # Do not endlessly retry auth failures or invalid configuration errors
        if error_message and any(unretryable in error_message.upper() for unretryable in ["AUTH_FAILED", "INVALID_CREDENTIAL", "PERMISSION_DENIED"]):
            return False
        return True

    def calculate_next_attempt_time(self, retry_count: int) -> datetime:
        delay = min(self.base_delay_seconds * (2 ** retry_count), self.max_delay_seconds)
        return datetime.now(timezone.utc) + timedelta(seconds=delay)

retry_engine = RetryEngine()
