import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import logging
from app.ml.model import LSTMAutoencoder
from app.pipeline.parser import parser_instance
from app.dataset_loader import load_real_dataset_dataframe

logger = logging.getLogger("logsentinel.train")

def load_real_log_sequences(seq_len: int = 10, vocab_size: int = 500) -> torch.Tensor:
    """
    Loads authentic HDFS log dataset, parses log templates using LogParser,
    and groups template IDs by Block ID into sequence windows for LSTM Autoencoder training.
    """
    df = load_real_dataset_dataframe()
    if df.empty:
        logger.warning("Real dataset DataFrame is empty. Falling back to synthetic sequences.")
        return generate_synthetic_normal_sequences(num_samples=500, seq_len=seq_len, vocab_size=vocab_size)

    logger.info(f"Building ML sequence windows from {len(df)} real HDFS log records...")

    # Group template IDs by Block_ID or Component
    block_sequences = {}
    for _, row in df.iterrows():
        block_id = str(row.get("Component", row.get("Block_ID", row.get("EventId", "blk_default"))))
        msg = str(row.get("Content", row.get("Message", row.get("Raw_Log", ""))))
        if not msg.strip():
            continue
        tmpl_id, _ = parser_instance.parse(msg)
        
        # Keep template IDs within vocabulary size
        valid_tmpl_id = (tmpl_id % (vocab_size - 1)) + 1
        
        if block_id not in block_sequences:
            block_sequences[block_id] = []
        block_sequences[block_id].append(valid_tmpl_id)


    sequences = []
    for block_id, tmpl_list in block_sequences.items():
        # Create sliding windows of length seq_len
        if len(tmpl_list) >= seq_len:
            for i in range(len(tmpl_list) - seq_len + 1):
                sequences.append(tmpl_list[i : i + seq_len])
        else:
            # Pad short sequences with template ID 0
            padded = [0] * (seq_len - len(tmpl_list)) + tmpl_list
            sequences.append(padded)

    # If sequences list is small, replicate sliding windows
    if len(sequences) < 100:
        sequences = sequences * (100 // max(1, len(sequences)) + 1)

    logger.info(f"Successfully constructed {len(sequences)} authentic log sequence windows for training.")
    return torch.tensor(sequences, dtype=torch.long)

def generate_synthetic_normal_sequences(num_samples: int = 500, seq_len: int = 10, vocab_size: int = 100):
    """
    Generates synthetic normal log sequences representing valid operational patterns.
    Normal patterns follow consistent transitions between template IDs 1..20.
    """
    np.random.seed(42)
    sequences = []
    
    # Common normal log workflows
    workflow_a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    workflow_b = [1, 3, 5, 7, 9, 2, 4, 6, 8, 10]
    workflow_c = [2, 4, 6, 8, 10, 1, 3, 5, 7, 9]

    for _ in range(num_samples):
        choice = np.random.choice([0, 1, 2])
        if choice == 0:
            base = list(workflow_a)
        elif choice == 1:
            base = list(workflow_b)
        else:
            base = list(workflow_c)
        
        if np.random.rand() > 0.8:
            idx = np.random.randint(0, seq_len)
            base[idx] = np.random.randint(1, 15)
            
        sequences.append(base)

    return torch.tensor(sequences, dtype=torch.long)

def train_model(
    save_path: str = "./models/lstm_autoencoder.pt",
    epochs: int = 40,
    batch_size: int = 32,
    learning_rate: float = 0.005,
    vocab_size: int = 500,
    seq_len: int = 10
):
    os.makedirs(os.path.dirname(os.path.abspath(save_path)), exist_ok=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = LSTMAutoencoder(vocab_size=vocab_size, sequence_length=seq_len).to(device)
    
    dataset = load_real_log_sequences(seq_len=seq_len, vocab_size=vocab_size)
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    best_loss = float("inf")
    patience = 5
    patience_counter = 0

    logger.info(f"Starting LSTM Autoencoder training on device: {device}")
    model.train()
    
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for batch in dataloader:
            batch = batch.to(device)
            optimizer.zero_grad()
            
            # Forward pass: reconstruct log sequence template logits
            logits = model(batch) # (batch_size, seq_len, vocab_size)
            
            # Loss computed per token position across sequence
            loss = criterion(logits.view(-1, vocab_size), batch.view(-1))
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item() * batch.size(0)
            
        avg_loss = total_loss / len(dataset)
        
        if epoch % 5 == 0 or epoch == epochs:
            logger.info(f"Epoch {epoch}/{epochs} - Loss: {avg_loss:.4f}")
            
        # Early stopping check
        if avg_loss < best_loss:
            best_loss = avg_loss
            torch.save({
                'model_state_dict': model.state_dict(),
                'vocab_size': vocab_size,
                'seq_len': seq_len,
                'best_loss': best_loss
            }, save_path)
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info(f"Early stopping triggered at epoch {epoch}")
                break

    logger.info(f"Model training complete. Weights saved to {save_path}")
    return save_path

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_model()
