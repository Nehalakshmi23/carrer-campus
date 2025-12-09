# app.py – Career Compass Backend (UPDATED with DOCX, DOC, ODT support)
import os
import datetime
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
from flask_sqlalchemy import SQLAlchemy
from passlib.hash import pbkdf2_sha256
import jwt
import joblib
import docx
try:
    from odf import text, teletype
    from odf.opendocument import load as load_odt
    ODT_SUPPORT = True
except ImportError:
    ODT_SUPPORT = False

# ---------------- CONFIG ----------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "app.db")

SECRET_KEY = "career-secret-key"
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 12

MODEL_PATH = os.path.join(BASE_DIR, "career_model.pkl")
VEC_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")

# --------------- FLASK SETUP ---------------
app = Flask(__name__)

# Configure CORS to allow requests from frontend
CORS(app, 
     origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
              "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
     allow_headers=['Content-Type', 'Authorization'],
     expose_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     supports_credentials=True,
     max_age=3600)

app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# --------------- USER MODEL ---------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def verify_password(self, password):
        return pbkdf2_sha256.verify(password, self.password_hash)

# --------------- DB INIT ----------------
def init_db():
    if not os.path.exists(DB_PATH):
        db.create_all()
        print("Database created")
    else:
        print("Database already exists")

# --------------- DEFAULT USER ----------------
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

# --------------- FILE TEXT EXTRACTION ----------------
def extract_pdf_text(path):
    """Extract text from PDF files"""
    try:
        text = ""
        reader = PdfReader(path)
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return ""

def extract_docx_text(path):
    """Extract text from DOCX files"""
    try:
        doc = docx.Document(path)
        return "\n".join([p.text for p in doc.paragraphs]).strip()
    except Exception as e:
        print(f"Error extracting DOCX: {e}")
        return ""

def extract_doc_text(path):
    """Extract text from DOC files (using python-docx)"""
    try:
        doc = docx.Document(path)
        return "\n".join([p.text for p in doc.paragraphs]).strip()
    except Exception as e:
        print(f"Error extracting DOC: {e}")
        return ""

def extract_odt_text(path):
    """Extract text from ODT files"""
    if not ODT_SUPPORT:
        return ""
    try:
        doc = load_odt(path)
        text_content = []
        for paragraph in doc.getElementsByType(text.P):
            text_content.append(teletype.extractText(paragraph))
        return "\n".join(text_content).strip()
    except Exception as e:
        print(f"Error extracting ODT: {e}")
        return ""

def extract_plain_text(path):
    """Extract text from TXT files"""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read().strip()
    except Exception as e:
        print(f"Error extracting TXT: {e}")
        return ""

def extract_text_from_file(file_path):
    """
    Universal file text extractor
    Supports: PDF, DOCX, DOC, ODT, TXT
    """
    file_path_lower = file_path.lower()
    
    if file_path_lower.endswith(".pdf"):
        return extract_pdf_text(file_path)
    elif file_path_lower.endswith(".docx"):
        return extract_docx_text(file_path)
    elif file_path_lower.endswith(".doc"):
        return extract_doc_text(file_path)
    elif file_path_lower.endswith(".odt"):
        return extract_odt_text(file_path)
    elif file_path_lower.endswith(".txt"):
        return extract_plain_text(file_path)
    else:
        # Try plain text extraction as fallback
        return extract_plain_text(file_path)

# --------------- LOAD ML MODEL ----------------
model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VEC_PATH)

def compute_match_score(resume_text, job_text):
    combined = resume_text + " " + job_text
    X = vectorizer.transform([combined])
    prob = model.predict_proba(X)[0][1]
    score = round(prob * 10, 2)
    return score

# --------------- JWT HELPERS ----------------
def create_token(user_id):
    payload = {
        "sub": str(user_id),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGO)

def decode_token(token):
    return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGO])

def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        # Get Authorization header
        auth_header = request.headers.get("Authorization")
        print(f"[AUTH] Authorization header: {auth_header[:30] if auth_header else 'NONE'}...")
        print(f"[AUTH] All headers: {dict(request.headers)}")
        
        if not auth_header:
            print("[AUTH] ❌ No Authorization header provided")
            return jsonify({"error": "Missing token"}), 401
            
        if not auth_header.startswith("Bearer "):
            print(f"[AUTH] ❌ Invalid header format: {auth_header[:30]}")
            return jsonify({"error": "Invalid token format"}), 401

        try:
            token = auth_header.split(" ", 1)[1]
            print(f"[AUTH] Token extracted: {token[:30]}...")
        except IndexError:
            print("[AUTH] ❌ Could not extract token from header")
            return jsonify({"error": "Missing token"}), 401

        try:
            print(f"[AUTH] Attempting to decode token...")
            payload = decode_token(token)
            print(f"[AUTH] ✅ Token decoded successfully, user_id: {payload.get('sub')}")
        except jwt.ExpiredSignatureError:
            print("[AUTH] ❌ Token expired")
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError as e:
            print(f"[AUTH] ❌ Invalid token error: {str(e)}")
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            print(f"[AUTH] ❌ Token decode error: {str(e)}")
            return jsonify({"error": "Invalid token"}), 401

        user = User.query.get(int(payload["sub"]))
        if not user:
            print(f"[AUTH] ❌ User not found for id: {payload['sub']}")
            return jsonify({"error": "User not found"}), 401

        print(f"[AUTH] ✅ Auth successful for user: {user.email}")
        request.user = user
        return f(*args, **kwargs)
    return wrapper

# --------------- OPTIONS PREFLIGHT HANDLERS ----------------
@app.route("/signup", methods=["OPTIONS"])
def signup_options():
    print("[PREFLIGHT] /signup OPTIONS request")
    return "", 204

@app.route("/login", methods=["OPTIONS"])
def login_options():
    print("[PREFLIGHT] /login OPTIONS request")
    return "", 204

@app.route("/analyze", methods=["OPTIONS"])
def analyze_options():
    print("[PREFLIGHT] /analyze OPTIONS request")
    return "", 204

# --------------- AUTH ROUTES ----------------
@app.route("/signup", methods=["POST"])
def signup():
    print("[SIGNUP] Signup request received")
    data = request.json
    email = data["email"].lower()
    password = data["password"]

    if User.query.filter_by(email=email).first():
        print(f"[SIGNUP] Email already exists: {email}")
        return jsonify({"error": "Email already registered"}), 400

    hashed = pbkdf2_sha256.hash(password)
    user = User(email=email, password_hash=hashed)
    db.session.add(user)
    db.session.commit()
    print(f"[SIGNUP] New user created: {email}")

    token = create_token(user.id)
    print(f"[SIGNUP] Token created for user: {email}")
    return jsonify({"token": token})

@app.route("/login", methods=["POST"])
def login():
    print("[LOGIN] Login request received")
    data = request.json
    email = data["email"].lower()
    password = data["password"]

    user = User.query.filter_by(email=email).first()
    if not user or not user.verify_password(password):
        print(f"[LOGIN] Invalid credentials for: {email}")
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(user.id)
    print(f"[LOGIN] Token created for user: {email}")
    return jsonify({"token": token})

# --------------- ANALYZE ROUTE ----------------
@app.route("/analyze", methods=["POST"])
@auth_required
def analyze():
    print(f"[ANALYZE] Request received from user: {request.user.email}")
    resume_text = request.form.get("resume_text", "")
    job_text = request.form.get("job_text", "")
    
    print(f"[ANALYZE] Resume text length: {len(resume_text)}")
    print(f"[ANALYZE] Job text length: {len(job_text)}")

    # ------------ File Extract Logic - Resume ----------
    if "resume" in request.files:
        file = request.files["resume"]
        print(f"[ANALYZE] Resume file received: {file.filename}")
        if file.filename:
            path = os.path.join("uploads", file.filename)
            os.makedirs("uploads", exist_ok=True)
            try:
                file.save(path)
                resume_text = extract_text_from_file(path)
                print(f"[ANALYZE] Extracted resume text length: {len(resume_text)}")
            finally:
                if os.path.exists(path):
                    os.remove(path)

    # ------------ File Extract Logic - Job ----------
    if "job" in request.files:
        file = request.files["job"]
        print(f"[ANALYZE] Job file received: {file.filename}")
        if file.filename:
            path = os.path.join("uploads", file.filename)
            os.makedirs("uploads", exist_ok=True)
            try:
                file.save(path)
                job_text = extract_text_from_file(path)
                print(f"[ANALYZE] Extracted job text length: {len(job_text)}")
            finally:
                if os.path.exists(path):
                    os.remove(path)

    # ------------ Validation -------------
    if not resume_text or not resume_text.strip():
        return jsonify({"error": "Resume text missing or unable to extract from file"}), 400

    if not job_text or not job_text.strip():
        return jsonify({"error": "Job description missing or unable to extract from file"}), 400

    # ------------ Scoring -------------
    score = compute_match_score(resume_text, job_text)

    return jsonify({
        "match_score": score,
        "message": f"Match Score: {score}/10"
    })

# --------------- MAIN ----------------
if __name__ == "__main__":
    with app.app_context():
        init_db()
        create_default_user()

    app.run(port=5000, debug=True)
