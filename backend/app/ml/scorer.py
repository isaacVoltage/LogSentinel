import os
import torch
import torch.nn.functional as F
import numpy as np
import logging
from typing import List, Tuple, Dict, Any
from app.ml.model import LSTMAutoencoder

logger = logging.getLogger("logsentinel.scorer")

class RiskScorer:
    """
    RiskScorer uses the trained LSTM Autoencoder to score sequence reconstruction loss
    and compute a normalized Risk Score (0-100). Also extracts root-cause sequence chains.
    Supports active learning dampening via False Positive feedback rules.
    """
    def __init__(self, model_path: str = "./models/lstm_autoencoder.pt", vocab_size: int = 500, seq_len: int = 10):
        self.model_path = model_path
        self.vocab_size = vocab_size
        self.seq_len = seq_len
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = LSTMAutoencoder(vocab_size=vocab_size, sequence_length=seq_len).to(self.device)
        self.is_loaded = False
        self.false_positive_rules: Dict[int, float] = {} # template_id -> dampening_factor
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                checkpoint = torch.load(self.model_path, map_location=self.device)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.model.eval()
                self.is_loaded = True
                logger.info(f"Loaded ML model weights from {self.model_path}")
            except Exception as e:
                logger.error(f"Failed to load model from {self.model_path}: {e}")
        else:
            logger.warning(f"No trained model found at {self.model_path}. Model will use random initialization.")
            self.model.eval()

    def set_false_positive_rule(self, template_id: int, dampening_factor: float = 0.25):
        """Register or update a false positive rule multiplier for a specific log template ID."""
        self.false_positive_rules[template_id] = dampening_factor
        logger.info(f"Registered False Positive Rule: template #{template_id} -> multiplier {dampening_factor}")

    def remove_false_positive_rule(self, template_id: int):
        """Remove a false positive dampening rule."""
        if template_id in self.false_positive_rules:
            del self.false_positive_rules[template_id]
            logger.info(f"Removed False Positive Rule for template #{template_id}")

    def score_sequence(
        self, 
        sequence_window: List[Tuple[int, str]], 
        severity: str = "INFO", 
        raw_message: str = ""
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Calculates 0-100 risk score and extracts root-cause sequence chain for given log sequence window.
        sequence_window: list of (template_id, raw_message)
        """
        if not sequence_window:
            return 0.0, []

        template_ids = [item[0] % self.vocab_size for item in sequence_window]
        
        # Ensure sequence matching model's expected length
        if len(template_ids) < self.seq_len:
            padding = [0] * (self.seq_len - len(template_ids))
            template_ids = padding + template_ids
            raw_window = [("<PADDING>", "<PADDING>")] * (self.seq_len - len(sequence_window)) + sequence_window
        else:
            template_ids = template_ids[-self.seq_len:]
            raw_window = sequence_window[-self.seq_len:]

        input_tensor = torch.tensor([template_ids], dtype=torch.long, device=self.device)

        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = F.softmax(logits, dim=-1)
            
            per_token_losses = []
            for i, target_id in enumerate(template_ids):
                p = probs[0, i, target_id].item()
                # Negative log likelihood loss with smoothing floor
                loss_i = -np.log(max(p, 1e-4))
                per_token_losses.append(loss_i)

        avg_reconstruction_error = float(np.mean(per_token_losses))
        
        # Check severity and error keywords in message
        sev_upper = (severity or "INFO").upper()
        msg_lower = (raw_message or "").lower()
        
        has_error_keyword = any(k in msg_lower for k in [
            "error", "fatal", "critical", "corrupt", "failed", "refused", "exception", "emergency", "unauth"
        ])
        has_warning_keyword = any(k in msg_lower for k in ["warn", "warning", "timeout", "retry"])

        # Base risk from ML model reconstruction error
        # Normal error ~ 0.5 - 2.5 -> Base Risk ~ 15 - 35
        base_risk = min(40.0, (avg_reconstruction_error / 5.0) * 35.0)

        if sev_upper in ["ERROR", "CRITICAL", "FATAL"] or has_error_keyword:
            # Explicit error / critical log: high risk (75 - 100)
            risk_score = round(float(np.clip(75.0 + base_risk * 0.6, 75.0, 100.0)), 1)
        elif sev_upper in ["WARN", "WARNING"] or has_warning_keyword:
            # Warning log: medium risk (55 - 72)
            risk_score = round(float(np.clip(55.0 + base_risk * 0.5, 55.0, 72.0)), 1)
        else:
            # Normal INFO log: low risk (5 - 35)
            risk_score = round(float(np.clip(base_risk, 5.0, 38.0)), 1)

        # Apply False Positive Dampening if any template in the sequence window has a feedback rule
        matched_dampeners = [
            self.false_positive_rules[tmpl_id] 
            for tmpl_id, _ in sequence_window 
            if tmpl_id in self.false_positive_rules
        ]
        
        if matched_dampeners:
            multiplier = min(matched_dampeners) # strongest dampener applies
            original_risk = risk_score
            risk_score = round(float(risk_score * multiplier), 1)
            logger.debug(f"Applied False Positive dampening: {original_risk} -> {risk_score} (multiplier: {multiplier})")

        # Extract Root-Cause Chain
        total_err = sum(per_token_losses) if sum(per_token_losses) > 0 else 1.0
        root_cause_chain = []
        
        for idx, (tmpl_id, msg) in enumerate(raw_window):
            if tmpl_id == 0:
                continue # Skip padding
            err = per_token_losses[idx]
            contrib = (err / total_err) * 100.0
            root_cause_chain.append({
                "template_id": tmpl_id,
                "raw_message": msg,
                "reconstruction_error": round(float(err), 4),
                "contribution_percentage": round(float(contrib), 1)
            })

        # Sort root cause items by highest error contribution descending
        root_cause_chain.sort(key=lambda x: x["reconstruction_error"], reverse=True)

        return risk_score, root_cause_chain


# Global Scorer instance
scorer_instance = RiskScorer()
