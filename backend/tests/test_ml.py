import pytest
import torch
from app.ml.model import LSTMAutoencoder
from app.ml.scorer import RiskScorer

def test_lstm_autoencoder_dimensions():
    vocab_size = 100
    seq_len = 10
    batch_size = 4
    model = LSTMAutoencoder(vocab_size=vocab_size, sequence_length=seq_len)
    
    x = torch.randint(0, vocab_size, (batch_size, seq_len))
    logits = model(x)
    
    assert logits.shape == (batch_size, seq_len, vocab_size)

def test_risk_scorer():
    scorer = RiskScorer(vocab_size=100, seq_len=10)
    
    # Test scoring sequence
    normal_seq = [(1, "Normal msg 1"), (2, "Normal msg 2"), (3, "Normal msg 3")]
    risk_score, root_cause, shap_summary = scorer.score_sequence(normal_seq)
    
    assert 0.0 <= risk_score <= 100.0
    assert isinstance(root_cause, list)
    assert "shap_attributions" in shap_summary
