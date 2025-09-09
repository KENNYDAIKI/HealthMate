import re, json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline
import joblib

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"
MODELS = ROOT / "models"

def norm_text(s: str) -> str:
    s = s.strip().lower()
    s = s.replace(" ", "").replace("-", "_")
    s = re.sub(r"__+", "_", s)
    return s.strip("_")

def main():
    dataset = pd.read_csv(RAW / "dataset.csv")
    severity = pd.read_csv(RAW / "Symptom-severity.csv")
    description = pd.read_csv(RAW / "symptom_Description.csv")
    precaution = pd.read_csv(RAW / "symptom_precaution.csv")

    symptom_cols = [c for c in dataset.columns if c.startswith("Symptom_")]

    # Normalize severity lookup
    severity["sym_norm"] = severity["Symptom"].astype(str).map(norm_text)
    severity_weights = dict(zip(severity["sym_norm"], severity["weight"].astype(float)))

    # Symptom vocabulary
    sym_vocab = set()
    for col in symptom_cols:
        vals = dataset[col].dropna().astype(str).map(norm_text).unique().tolist()
        sym_vocab.update(vals)
    sym_vocab = sorted(sym_vocab)
    idx = {s:i for i,s in enumerate(sym_vocab)}

    # Build X matrix (severity-weighted presence), and y
    X = np.zeros((len(dataset), len(sym_vocab)), dtype=float)
    for i, row in dataset.iterrows():
        for col in symptom_cols:
            v = row[col]
            if isinstance(v, str) and v.strip():
                s = norm_text(v)
                j = idx[s]
                X[i, j] = severity_weights.get(s, 1.0)
    le = LabelEncoder()
    y = le.fit_transform(dataset["Disease"].astype(str))

    # Split, build pipeline, train
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    pipe = Pipeline([
        ("scaler", StandardScaler(with_mean=False)),
        ("mlp", MLPClassifier(hidden_layer_sizes=(256,128), activation="relu", solver="adam",
                              alpha=1e-4, max_iter=300, random_state=42, verbose=True))
    ])
    pipe.fit(Xtr, ytr)

    yhat = pipe.predict(Xte)
    acc = accuracy_score(yte, yhat)
    print(f"\nAccuracy: {acc:.4f}\n")
    print(classification_report(yte, yhat, target_names=le.classes_))

    # Save artifacts
    PROC.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)

    pd.Series(sym_vocab, name="symptom").to_csv(PROC / "symptom_vocab.csv", index=False)
    pd.DataFrame({"symptom": list(severity_weights.keys()), "weight": list(severity_weights.values())}).to_csv(PROC / "severity_weights.csv", index=False)

    joblib.dump(pipe, MODELS / "ann_pipeline.joblib")
    joblib.dump(le, MODELS / "label_encoder.joblib")

    # Save disease info JSON
    desc_map = dict(zip(description["Disease"], description["Description"]))
    prec_map = dict(zip(precaution["Disease"],
                        precaution.filter(like="Precaution_").apply(lambda r: [p for p in r if isinstance(p, str) and p.strip()], axis=1)))
    with open(PROC / "disease_info.json", "w") as f:
        json.dump({"description": desc_map, "precautions": prec_map}, f, indent=2)

    print("\nSaved artifacts to 'data/processed' and 'models'.")

if __name__ == "__main__":
    main()