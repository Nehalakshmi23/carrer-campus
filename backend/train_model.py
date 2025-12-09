# train_model.py – Train Resume/Job Matching Model
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib

# ---------------- LOAD TRAINING DATA ----------------
data = pd.DataFrame([
    ["java python sql", "backend developer", 1],
    ["html css javascript react", "frontend developer", 1],
    ["aws docker linux", "cloud engineer", 1],
    ["accounting finance", "software engineer", 0],
    ["python flask api", "backend developer", 1],
    ["react ui design", "frontend developer", 1],
    ["sql data analysis", "data scientist", 1],
])

data.columns = ["resume", "job", "label"]

# Combine resume + job text
data["text"] = data["resume"] + " " + data["job"]

# ---------------- VECTORIZE ----------------
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(data["text"])
y = data["label"]

# ---------------- TRAIN MODEL ----------------
model = LogisticRegression()
model.fit(X, y)

# ---------------- SAVE FILES ----------------
joblib.dump(model, "career_model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model + Vectorizer created successfully!")
