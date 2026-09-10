from collections import deque
from typing import Dict, List, Optional, Tuple, Any

class WindowingBuffer:
    """
    Sliding window buffer that aggregates template IDs and log entries per session/block_id.
    Returns sequence window when full or on demand.
    """
    def __init__(self, window_size: int = 10):
        self.window_size = window_size
        self.buffers: Dict[str, deque] = {} # block_id -> deque of (template_id, raw_message)

    def add_log(self, block_id: str, template_id: int, raw_message: str) -> Optional[List[Tuple[int, str]]]:
        """
        Adds a log entry to block's buffer. 
        Returns the sliding window sequence if buffer has reached at least window_size items.
        """
        if block_id not in self.buffers:
            self.buffers[block_id] = deque(maxlen=self.window_size)
            
        self.buffers[block_id].append((template_id, raw_message))
        
        # If buffer is filled to window_size, return sequence window list
        if len(self.buffers[block_id]) == self.window_size:
            return list(self.buffers[block_id])
        
        # If buffer is smaller than window_size (e.g. early stream), pad sequence with 0s
        padded = list(self.buffers[block_id])
        while len(padded) < self.window_size:
            padded.insert(0, (0, "<PADDING>"))
        return padded

    def reset_block(self, block_id: str):
        if block_id in self.buffers:
            self.buffers[block_id].clear()

# Global windowing buffer instance
windowing_instance = WindowingBuffer(window_size=10)
