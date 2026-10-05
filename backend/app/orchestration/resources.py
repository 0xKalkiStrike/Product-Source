try:
    import psutil
except ImportError:
    psutil = None

class ResourceManager:
    """
    Monitors CPU, RAM, and system load.
    Enforces controlled degradation when load is high instead of crashing application.
    """
    def __init__(self, cpu_threshold: float = 85.0, ram_threshold: float = 90.0):
        self.cpu_threshold = cpu_threshold
        self.ram_threshold = ram_threshold

    def get_metrics(self) -> dict:
        if psutil:
            cpu = psutil.cpu_percent(interval=None)
            memory = psutil.virtual_memory()
            mem_pct = memory.percent
            mem_used = round(memory.used / (1024 * 1024), 2)
            mem_total = round(memory.total / (1024 * 1024), 2)
        else:
            cpu = 15.0
            mem_pct = 35.0
            mem_used = 4096.0
            mem_total = 16384.0

        return {
            "cpu_percent": cpu,
            "memory_percent": mem_pct,
            "memory_used_mb": mem_used,
            "memory_total_mb": mem_total,
            "high_load": cpu >= self.cpu_threshold or mem_pct >= self.ram_threshold
        }

    def should_throttle(self) -> bool:
        metrics = self.get_metrics()
        return metrics["high_load"]

resource_manager = ResourceManager()
