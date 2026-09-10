import torch
import torch.nn as nn

class LSTMAutoencoder(nn.Module):
    """
    PyTorch LSTM Autoencoder for Log Sequence Anomaly Detection.
    Architecture:
      Encoder: Embedding -> 2-layer LSTM -> Latent Representation
      Decoder: 2-layer LSTM -> Linear Layer -> Reconstructed Token Embeddings/Logits
    """
    def __init__(
        self, 
        vocab_size: int = 1000, 
        embedding_dim: int = 32, 
        hidden_dim: int = 64, 
        latent_dim: int = 16,
        num_layers: int = 2,
        sequence_length: int = 10
    ):
        super(LSTMAutoencoder, self).__init__()
        self.vocab_size = vocab_size
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.latent_dim = latent_dim
        self.num_layers = num_layers
        self.sequence_length = sequence_length

        # Embedding Layer
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=0)

        # 2-layer LSTM Encoder
        self.encoder_lstm = nn.LSTM(
            input_size=embedding_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True
        )
        self.encoder_latent = nn.Linear(hidden_dim, latent_dim)

        # 2-layer LSTM Decoder
        self.decoder_latent = nn.Linear(latent_dim, hidden_dim)
        self.decoder_lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True
        )
        self.output_layer = nn.Linear(hidden_dim, vocab_size)

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch_size, seq_len)
        embedded = self.embedding(x) # (batch_size, seq_len, embed_dim)
        out, (hn, cn) = self.encoder_lstm(embedded)
        # Use last hidden state of top LSTM layer
        last_hidden = hn[-1] # (batch_size, hidden_dim)
        latent = self.encoder_latent(last_hidden) # (batch_size, latent_dim)
        return latent

    def decode(self, latent: torch.Tensor) -> torch.Tensor:
        # latent shape: (batch_size, latent_dim)
        h_decoded = self.decoder_latent(latent) # (batch_size, hidden_dim)
        # Repeat latent vector across sequence length
        repeated = h_decoded.unsqueeze(1).repeat(1, self.sequence_length, 1) # (batch_size, seq_len, hidden_dim)
        out, _ = self.decoder_lstm(repeated) # (batch_size, seq_len, hidden_dim)
        reconstruction = self.output_layer(out) # (batch_size, seq_len, vocab_size)
        return reconstruction

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch_size, seq_len)
        latent = self.encode(x)
        logits = self.decode(latent)
        return logits
