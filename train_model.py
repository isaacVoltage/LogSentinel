import os
import sys

# Ensure backend directory is in python module search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.ml.train import train_model

if __name__ == "__main__":
    print("=" * 70)
    print("[INFO] LogSentinel - Model Retraining Script")
    print("=" * 70)
    train_model()

