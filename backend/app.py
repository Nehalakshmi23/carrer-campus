# app.py — Career Compass backend (ATS-grade report)
import os
import re
import datetime
from functools import wraps
from typing import List, Tuple, Dict

from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
from flask_sqlalchemy import SQLAlchemy
from passlib.hash import pbkdf2_sha256
import jwt
import joblib

# ---------------- CONFIG ----------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "app.db")

SECRET_KEY = "career-secret-key"
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 12

MODEL_PATH = os.path.join(BASE_DIR, "career_model.pkl")
VEC_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")

# ---------------- FLASK SETUP ----------------
app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# ---------------- USER MODEL ----------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def verify_password(self, password):
        return pbkdf2_sha256.verify(password, self.password_hash)

# ---------------- DB INIT ----------------
def init_db():
    if not os.path.exists(DB_PATH):
        db.create_all()
        print("Database created")
    else:
        print("Database already exists")

def create_default_user():
    email = "admin@example.com"
    password = "admin123"
    user = User.query.filter_by(email=email).first()
    if not user:
        hashed = pbkdf2_sha256.hash(password)
        user = User(email=email, password_hash=hashed)
        db.session.add(user)
        db.session.commit()
        print("Default admin created")
    else:
        print("Admin already exists")

# ---------------- File extraction ----------------
def extract_pdf_text(path: str) -> str:
    text = ""
    reader = PdfReader(path)
    for page in reader.pages:
        content = page.extract_text()
        if content:
            text += content + "\n"
    return text or ""

def extract_docx_text(path: str) -> str:
    try:
        import docx
    except ImportError:
        raise RuntimeError("python-docx not installed. pip install python-docx")
    doc = docx.Document(path)
    return "\n".join([p.text for p in doc.paragraphs]) or ""

def extract_plain_text(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""

# ---------------- Load ML artifacts ----------------
if not (os.path.exists(MODEL_PATH) and os.path.exists(VEC_PATH)):
    print("Warning: Model or vectorizer not found. train_model.py must be run first or place model files.")
    model = None
    vectorizer = None
else:
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VEC_PATH)

# Small skill list (expand as needed)
SKILLS = [
    "python","java","c++","c","javascript","react","react js","reactjs","angular","vue",
    "html","css","sql","postgresql","mysql","mongodb","docker","kubernetes","aws","azure",
    "gcp","flask","django","spring","nodejs","node","express","rest","graphql","tensorflow",
    "pytorch","nlp","linux","git","ci/cd","html5","css3","typescript","redux"
]

# ---------------- Utilities for ATS report ----------------
def normalize_text(t: str) -> str:
    return re.sub(r"\s+", " ", (t or "").lower()).strip()

def extract_skills_from_text(text: str, skills_list: List[str]) -> List[str]:
    t = normalize_text(text)
    found = []
    for skill in skills_list:
        # match whole words or common tokens
        pat = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pat, t):
            found.append(skill)
    return list(dict.fromkeys(found))

def extract_years_experience(text: str) -> float:
    # Very simple heuristic: look for patterns like "3 years", "2.5 yrs", "five years"
    t = normalize_text(text)
    # find digits with years
    m = re.findall(r"(\d+(?:\.\d+)?)\s*(?:\+?\s*)?(?:years?|yrs?)", t)
    if m:
        # return the max years found
        years = max([float(x) for x in m])
        return years
    # fallback: check "experienced", "senior", etc.
    if "senior" in t:
        return 5.0
    if "mid" in t or "mid-level" in t:
        return 3.0
    if "junior" in t:
        return 1.0
    return 0.0

def compute_keyword_coverage(resume_text: str, job_text: str) -> float:
    # basic percent of unique job words present in resume
    r = normalize_text(resume_text)
    j = normalize_text(job_text)
    job_words = [w for w in re.findall(r"[a-zA-Z0-9\+\#\.\-]+", j) if len(w) > 2]
    if not job_words:
        return 0.0
    matched = 0
    unique = set(job_words)
    for w in unique:
        if re.search(r"\b" + re.escape(w) + r"\b", r):
            matched += 1
    coverage = matched / len(unique)
    return round(coverage * 100, 2)

def semantic_similarity_score(resume_text: str, job_text: str) -> float:
    # Uses vectorizer to compute cosine similarity, scaled to 0-10
    if vectorizer is None:
        return 0.0
    X = vectorizer.transform([resume_text, job_text])
    try:
        from sklearn.metrics.pairwise import cosine_similarity
    except Exception:
        return 0.0
    sim = cosine_similarity(X[0], X[1])[0][0]  # 0..1
    return round(sim * 10, 2)

def model_probability_score(resume_text: str, job_text: str) -> float:
    # Uses trained classifier to return probability*10
    if model is None or vectorizer is None:
        return 0.0
    X = vectorizer.transform([resume_text + " " + job_text])
    try:
        prob = float(model.predict_proba(X)[0][1])
    except Exception:
        prob = 0.0
    return round(prob * 10, 2)

def make_recommendations(missing_skills: List[str], resume_text: str, job_text: str) -> List[str]:
    recs = []
    if missing_skills:
        recs.append(f"Consider adding the following skills to your resume: {', '.join(missing_skills[:8])}.")
    # Suggest emphasizing transferable projects that mention similar tech
    if "project" in normalize_text(resume_text):
        recs.append("Highlight project(s) that match the role's requirements in the top of your resume.")
    # If job mentions cloud but resume doesn't:
    if any(k in job_text.lower() for k in ["aws","azure","gcp"]) and not any(k in resume_text.lower() for k in ["aws","azure","gcp"]):
        recs.append("If you have cloud experience, add it (AWS/Azure/GCP). If not, consider a short cloud course/certification.")
    # generic advice
    recs.append("Use exact keywords from the job description (skills, tool names) in your resume where relevant.")
    return recs

# ---------------- JWT helpers (ensure sub is string) ----------------
def create_token(user_id: int):
    payload = {
        "sub": str(user_id),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HOURS)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGO)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGO])

def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401
        token = header.split(" ", 1)[1].strip()
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except Exception as e:
            return jsonify({"error": "Invalid token", "detail": str(e)}), 401
        # payload.sub is string; convert to int
        try:
            uid = int(payload.get("sub"))
        except Exception:
            return jsonify({"error": "Invalid token subject"}), 401
        user = User.query.get(uid)
        if not user:
            return jsonify({"error": "User not found"}), 401
        request.user = user
        return f(*args, **kwargs)
    return wrapper

# ---------------- Routes ----------------
@app.route("/")
def home():
    return "Career Compass Backend Running"

@app.route("/signup", methods=["POST"])
def signup():
    d = request.json or {}
    email = (d.get("email") or "").strip().lower()
    password = d.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400
    u = User(email=email, password_hash=pbkdf2_sha256.hash(password))
    db.session.add(u)
    db.session.commit()
    return jsonify({"token": create_token(u.id)})

@app.route("/login", methods=["POST"])
def login():
    d = request.json or {}
    email = (d.get("email") or "").strip().lower()
    password = d.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not user.verify_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"token": create_token(user.id)})

@app.route("/model-status", methods=["GET"])
def model_status():
    exists = (model is not None) and (vectorizer is not None)
    return jsonify({"trained": exists})

@app.route("/analyze", methods=["POST"])
@auth_required
def analyze():
    resume_text = request.form.get("resume_text", "") or ""
    job_text = request.form.get("job_text", "") or ""

    # handle file uploads (pdf/docx/txt)
    if "resume" in request.files:
        f = request.files["resume"]
        os.makedirs("uploads", exist_ok=True)
        path = os.path.join("uploads", f.filename)
        f.save(path)
        if path.lower().endswith(".pdf"):
            resume_text = extract_pdf_text(path)
        elif path.lower().endswith(".docx"):
            resume_text = extract_docx_text(path)
        else:
            resume_text = extract_plain_text(path)
        try:
            os.remove(path)
        except:
            pass

    if "job" in request.files:
        f = request.files["job"]
        os.makedirs("uploads", exist_ok=True)
        path = os.path.join("uploads", f.filename)
        f.save(path)
        if path.lower().endswith(".pdf"):
            job_text = extract_pdf_text(path)
        elif path.lower().endswith(".docx"):
            job_text = extract_docx_text(path)
        else:
            job_text = extract_plain_text(path)
        try:
            os.remove(path)
        except:
            pass

    resume_text = (resume_text or "").strip()
    job_text = (job_text or "").strip()

    if not resume_text:
        return jsonify({"error": "Resume text missing"}), 400
    if not job_text:
        return jsonify({"error": "Job description missing"}), 400

    # normalize
    r_text = normalize_text(resume_text)
    j_text = normalize_text(job_text)

    # extract skills
    resume_skills = extract_skills_from_text(r_text, SKILLS)
    job_skills = extract_skills_from_text(j_text, SKILLS)

    matched_skills = [s for s in job_skills if s in resume_skills]
    missing_skills = [s for s in job_skills if s not in resume_skills]

    # compute metrics
    skill_match_percent = round((len(matched_skills) / max(len(job_skills), 1)) * 100, 2)
    keyword_coverage = compute_keyword_coverage(r_text, j_text)  # percent
    semantic_sim = semantic_similarity_score(r_text, j_text)  # 0-10
    model_prob = model_probability_score(r_text, j_text)  # 0-10
    years_exp = extract_years_experience(r_text)

    # Weighted final score (example weights — tune as needed)
    # weights: skill_match 30%, keyword_coverage 20%, semantic 30%, model 20%
    final_score = (
        (skill_match_percent / 100.0) * 30 +
        (keyword_coverage / 100.0) * 20 +
        (semantic_sim / 10.0) * 30 +
        (model_prob / 10.0) * 20
    )
    final_score = round((final_score / 100.0) * 10, 2)  # scale to 0-10

    # recommendations
    recommendations = make_recommendations(missing_skills, r_text, j_text)

    # build report
    report = {
        "final_score": final_score,
        "score_breakdown": {
            "skill_match_percent": skill_match_percent,   # 0-100
            "keyword_coverage_percent": keyword_coverage,  # 0-100
            "semantic_similarity": semantic_sim,           # 0-10
            "model_probability_score": model_prob          # 0-10
        },
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "years_experience_estimate": years_exp,
        "recommendations": recommendations,
        "message": f"ATS Grade: {final_score}/10"
    }

    return jsonify(report), 200

# ---------------- MAIN ----------------
if __name__ == "__main__":
    with app.app_context():
        init_db()
        create_default_user()
    app.run(debug=True, port=5000)
