# ANN Symptom → Disease Classifier (Starter Project)

This project trains an Artificial Neural Network (ANN) using your dataset of **41 diseases** and **symptoms**,
and lets you **predict** a disease from a list of symptoms. It also attaches **description** and **precautions**.

## 0) Project structure

```
ann_starter_project/
├─ data/
│  ├─ raw/                # put your original CSVs here (already included)
│  └─ processed/          # generated files after training
├─ models/                # trained model + label encoder
├─ scripts/
│  ├─ train_ann.py        # train the ANN
│  └─ predict_ann.py      # run predictions (top-k)
└─ requirements.txt
```

## 1) Create a Python environment

```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Train the ANN

```bash
python scripts/train_ann.py
```

Outputs:
- `data/processed/symptom_vocab.csv` — full symptom universe
- `data/processed/severity_weights.csv` — normalized weights for each symptom
- `data/processed/disease_info.json` — descriptions + precautions
- `models/ann_pipeline.joblib` — the trained ANN (with scaler)
- `models/label_encoder.joblib` — mapping between class indices and disease names

You’ll also see an **accuracy** score and a **per-class report**.

## 3) Try a prediction

```bash
python scripts/predict_ann.py --symptoms "itching, skin_rash, nodal_skin_eruptions" --topk 3
```

It prints the **top-3 diseases** with probabilities and shows the **description** and **precautions**.

## 4) How it works (short)

- We convert each row’s `Symptom_1...Symptom_17` into a **symptom bag**.
- Each present symptom becomes a feature. We weight it by its **severity** (from `Symptom-severity.csv`).
- We **scale** features, then train a **ReLU MLP**: `256 → 128 → softmax`.
- The target is the **Disease** column (41 classes).

## 5) Notes & Tips

- Spell symptoms as in the dataset (underscores `_` are OK; we normalize spaces/hyphens).
- If training seems slow, reduce hidden sizes (e.g., `128, 64`), or set `max_iter=200`.
- To compare vs Logistic Regression, swap `MLPClassifier` for `LogisticRegression(multi_class="multinomial")`.

Happy training!