import os
import re
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger("logsentinel.parser")

try:
    from drain3 import TemplateMiner
    from drain3.template_miner_config import TemplateMinerConfig
    DRAIN3_AVAILABLE = True
except ImportError:
    DRAIN3_AVAILABLE = False
    logger.warning("Drain3 package not found, fallback simple template miner will be used.")

class LogParser:
    """
    LogParser uses Drain3 online log parsing to convert unstructured log messages
    into structured log templates and numerical Template IDs.
    """
    def __init__(self, persistence_file: str = "drain3_state.bin"):
        self.persistence_file = persistence_file
        self.miner = None
        self._fallback_templates: Dict[str, int] = {}
        self._next_fallback_id = 1
        
        if DRAIN3_AVAILABLE:
            try:
                config = TemplateMinerConfig()
                config.load(os.path.join(os.path.dirname(__file__), "drain3.ini")) if os.path.exists(
                    os.path.join(os.path.dirname(__file__), "drain3.ini")
                ) else None
                config.profiling_enabled = False
                self.miner = TemplateMiner(config=config)
                logger.info("Initialized Drain3 TemplateMiner successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Drain3: {e}. Switching to fallback parser.")
                self.miner = None

    def parse(self, raw_message: str) -> Tuple[int, str]:
        """
        Parses raw log message into (template_id, template_str).
        """
        cleaned_msg = self._clean_message(raw_message)
        
        if self.miner:
            try:
                result = self.miner.add_log_message(cleaned_msg)
                template_id = result["cluster_id"]
                template_str = result["template_mined"]
                return template_id, template_str
            except Exception as e:
                logger.error(f"Error during Drain3 parse: {e}")
        
        # Fallback simple template miner using parameter masking
        masked_msg = re.sub(r'\b\d+\b', '<NUM>', cleaned_msg)
        masked_msg = re.sub(r'blk_[-]?\d+', '<BLOCK>', masked_msg)
        masked_msg = re.sub(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '<IP>', masked_msg)
        
        if masked_msg not in self._fallback_templates:
            self._fallback_templates[masked_msg] = self._next_fallback_id
            self._next_fallback_id += 1
            
        return self._fallback_templates[masked_msg], masked_msg

    def _clean_message(self, message: str) -> str:
        # Strip timestamps if present at start of message
        cleaned = re.sub(r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:,\d+)?\s*', '', message)
        return cleaned.strip()

# Global parser instance
parser_instance = LogParser()
