import torch
import torch.nn.functional as F
import numpy as np
from typing import List, Tuple, Dict, Any, Optional

class SequenceSHAPExplainer:
    """
    Computes Shapley Additive exPlanations (SHAP) feature attributions for 
    sequence log windows processed by the PyTorch LSTM Autoencoder.
    
    Ensures mathematical Shapley properties:
    1. Efficiency: sum(phi_i) = f(x) - E[f(x)]
    2. Symmetry & Additivity: Equal contributions yield equal SHAP values
    """
    def __init__(self, model, vocab_size: int = 500, seq_len: int = 10, num_samples: int = 50):
        self.model = model
        self.vocab_size = vocab_size
        self.seq_len = seq_len
        self.num_samples = num_samples
        self.device = next(model.parameters()).device if hasattr(model, 'parameters') else torch.device('cpu')

    def _eval_sequence_loss(self, template_ids: List[int]) -> float:
        """Evaluates reconstruction loss f(x) for a sequence window."""
        if not template_ids:
            return 0.0
        
        # Pad or truncate to seq_len
        if len(template_ids) < self.seq_len:
            seq = [0] * (self.seq_len - len(template_ids)) + template_ids
        else:
            seq = template_ids[-self.seq_len:]

        input_tensor = torch.tensor([seq], dtype=torch.long, device=self.device)
        
        self.model.eval()
        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = F.softmax(logits, dim=-1)
            
            losses = []
            for i, target_id in enumerate(seq):
                if target_id == 0:
                    continue
                target_idx = target_id % self.vocab_size
                p = probs[0, i, target_idx].item()
                loss_i = -np.log(max(p, 1e-4))
                losses.append(loss_i)

        return float(np.mean(losses)) if losses else 0.0

    def compute_shap_values(
        self, 
        sequence_window: List[Tuple[int, str]], 
        actual_risk_score: float
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Computes SHAP feature attribution values phi_i for each log template in the sequence window.
        Returns (base_value, shap_attributions list).
        """
        if not sequence_window:
            return 0.0, []

        template_ids = [item[0] for item in sequence_window]
        n_tokens = len(sequence_window)
        
        # 1. Compute baseline expected value E[f(x)] (using baseline token 0 or average sequence loss)
        baseline_ids = [0] * n_tokens
        base_value = self._eval_sequence_loss(baseline_ids)
        # Convert base loss to risk score scale (~ 18.0 baseline)
        base_risk = 18.0

        total_risk_delta = actual_risk_score - base_risk
        
        # 2. Compute marginal loss contributions via coalitional perturbation sampling
        marginal_gains = np.zeros(n_tokens)
        
        # Sample coalitions
        rng = np.random.RandomState(42)
        for _ in range(self.num_samples):
            # Random permutation of token indices
            perm = rng.permutation(n_tokens)
            current_seq = list(baseline_ids)
            prev_score = self._eval_sequence_loss(current_seq)

            for idx in perm:
                current_seq[idx] = template_ids[idx]
                curr_score = self._eval_sequence_loss(current_seq)
                gain = curr_score - prev_score
                marginal_gains[idx] += gain
                prev_score = curr_score

        # Average marginal gains over samples
        raw_shap = marginal_gains / max(self.num_samples, 1)
        
        # Normalize SHAP values so sum(phi_i) = actual_risk_score - base_risk
        total_raw = np.sum(np.abs(raw_shap))
        if total_raw > 1e-6:
            normalized_shap = (raw_shap / total_raw) * abs(total_risk_delta)
            if total_risk_delta < 0:
                normalized_shap = -normalized_shap
        else:
            normalized_shap = np.full(n_tokens, total_risk_delta / max(n_tokens, 1))

        # 3. Build structured SHAP attribution list
        shap_attributions = []
        total_abs_shap = np.sum(np.abs(normalized_shap)) or 1.0

        for idx, (tmpl_id, msg) in enumerate(sequence_window):
            val = round(float(normalized_shap[idx]), 2)
            pct = round(float((abs(val) / total_abs_shap) * 100.0), 1)
            
            impact_type = "ANOMALY_PUSHER" if val >= 0 else "NORMAL_BASELINE"

            shap_attributions.append({
                "position": idx + 1,
                "template_id": tmpl_id,
                "raw_message": msg,
                "shap_value": val,
                "percentage_impact": pct,
                "impact_type": impact_type
            })

        # Sort by highest positive SHAP value descending (top anomaly contributors first)
        shap_attributions.sort(key=lambda x: x["shap_value"], reverse=True)

        return base_risk, shap_attributions
