import argparse, json, re
import numpy as np
import pandas as pd
from pathlib import Path
import joblib

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed"
MODELS = ROOT / "models"

def norm_text(s: str) -> str:
    s = s.strip().lower()
    s = s.replace(" ", "").replace("-", "_")
    s = re.sub(r"__+", "_", s)
    return s.strip("_")

def load_artifacts():
    pipe = joblib.load(MODELS / "ann_pipeline.joblib")
    le = joblib.load(MODELS / "label_encoder.joblib")
    vocab = pd.read_csv(PROC / "symptom_vocab.csv")["symptom"].tolist()
    with open(PROC / "severity_weights.csv", "r") as f:
        sw = pd.read_csv(PROC / "severity_weights.csv")
        sev = dict(zip(sw["symptom"], sw["weight"]))
    with open(PROC / "disease_info.json", "r") as f:
        info = json.load(f)
    return pipe, le, vocab, sev, info

def vectorize(symptoms, vocab, sev):
    # Create severity-weighted vector
    v = np.zeros(len(vocab), dtype=float)
    idx = {s:i for i,s in enumerate(vocab)}
    for s in symptoms:
        s2 = norm_text(s)
        if s2 in idx:
            v[idx[s2]] = float(sev.get(s2, 1.0))
    return v.reshape(1, -1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--symptoms", type=str, required=True,
                    help="Comma-separated symptom list, e.g. 'itching, skin_rash, nodal_skin_eruptions'")
    ap.add_argument("--topk", type=int, default=3)
    args = ap.parse_args()

    pipe, le, vocab, sev, info = load_artifacts()
    symptoms = [s.strip() for s in args.symptoms.split(",") if s.strip()]
    X = vectorize(symptoms, vocab, sev)
    probs = pipe.predict_proba(X)[0]
    topk_idx = np.argsort(probs)[::-1][:args.topk]
    print("\nInput symptoms:", symptoms)
    print("\nTop predictions:")
    for i in topk_idx:
        disease = le.classes_[i]
        p = probs[i]
        desc = info["description"].get(disease, "")
        precs = info["precautions"].get(disease, [])
        print(f"- {disease}  (prob={p:.3f})")
        if desc:
            print(f"  Description: {desc[:140]}{'...' if len(desc)>140 else ''}")
        if precs:
            print(f"  Precautions: {', '.join(precs)}")

if __name__ == "__main__":
    main()