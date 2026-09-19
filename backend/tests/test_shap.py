import pytest
from app.ml.model import LSTMAutoencoder
from app.ml.shap_explainer import SequenceSHAPExplainer
from app.ml.scorer import RiskScorer

def test_shap_explainer_computation():
    model = LSTMAutoencoder(vocab_size=500, sequence_length=10)
    explainer = SequenceSHAPExplainer(model, vocab_size=500, seq_len=10, num_samples=20)

    sequence_window = [
        (1, "2026-09-19 INFO Receiving block blk_1001"),
        (2, "2026-09-19 INFO BLOCK* NameSystem.allocateBlock"),
        (99, "2026-09-19 FATAL OutOfMemoryError in NameNode worker thread"),
        (98, "2026-09-19 CRITICAL Connection refused from DataNode")
    ]

    actual_risk = 88.5
    base_val, shap_attributions = explainer.compute_shap_values(sequence_window, actual_risk)

    assert base_val == 18.0
    assert len(shap_attributions) == 4
    
    # Check that attributions contain required fields
    for item in shap_attributions:
        assert "template_id" in item
        assert "shap_value" in item
        assert "percentage_impact" in item
        assert "impact_type" in item

    # Check top contributor is positive anomaly pusher
    top_item = shap_attributions[0]
    assert top_item["shap_value"] > 0
    assert top_item["impact_type"] == "ANOMALY_PUSHER"

def test_scorer_with_shap_integration():
    scorer = RiskScorer()
    sequence_window = [
        (1, "INFO Receiving block blk_1001"),
        (99, "FATAL OutOfMemoryError in NameNode")
    ]
    risk_score, root_cause, shap_summary = scorer.score_sequence(sequence_window, severity="FATAL", raw_message="FATAL OutOfMemoryError")

    assert risk_score >= 75.0
    assert "base_value" in shap_summary
    assert "shap_attributions" in shap_summary
    assert len(shap_summary["shap_attributions"]) == 2
