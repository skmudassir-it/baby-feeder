"""Baby Tracker API — Flask + SQLite + JWT — Full Phase 4 Expansion"""
import sqlite3, os, hashlib, secrets, json
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))
DB_PATH = os.environ.get("DB_PATH", "/opt/babyfeeder/db.sqlite3")

# ─── DB helpers ────────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
    return g.db

@app.teardown_appcontext
def close_db(_e=None):
    db = g.pop("db", None)
    if db: db.close()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = sqlite3.connect(DB_PATH)

    db.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, name TEXT NOT NULL, baby_name TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')))""")

    db.execute("""CREATE TABLE IF NOT EXISTS children (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        name TEXT NOT NULL, birth_date TEXT, gender TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.execute("""CREATE TABLE IF NOT EXISTS feedings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        child_name TEXT DEFAULT '', feed_type TEXT NOT NULL CHECK(feed_type IN ('milk','food')),
        food_name TEXT DEFAULT '', quantity REAL NOT NULL, unit TEXT DEFAULT 'ml',
        feed_time TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.execute("""CREATE TABLE IF NOT EXISTS growth_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        child_name TEXT DEFAULT '', height_cm REAL, weight_kg REAL,
        head_circumference_cm REAL, recorded_at TEXT NOT NULL, notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.execute("""CREATE TABLE IF NOT EXISTS sleep_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        child_name TEXT DEFAULT '', start_time TEXT NOT NULL, end_time TEXT NOT NULL,
        sleep_type TEXT NOT NULL CHECK(sleep_type IN ('nap','nighttime')),
        quality TEXT DEFAULT 'good' CHECK(quality IN ('poor','fair','good','excellent')),
        notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.execute("""CREATE TABLE IF NOT EXISTS diaper_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        child_name TEXT DEFAULT '', diaper_type TEXT NOT NULL CHECK(diaper_type IN ('wet','dirty','both')),
        color TEXT DEFAULT '', consistency TEXT DEFAULT '', recorded_at TEXT NOT NULL,
        notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.execute("""CREATE TABLE IF NOT EXISTS temp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        child_name TEXT DEFAULT '', temperature REAL NOT NULL,
        unit TEXT DEFAULT 'F' CHECK(unit IN ('F','C')),
        method TEXT DEFAULT 'oral' CHECK(method IN ('oral','rectal','axillary','ear','forehead')),
        symptoms TEXT DEFAULT '', recorded_at TEXT NOT NULL, notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.execute("""CREATE TABLE IF NOT EXISTS vaccinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        child_name TEXT DEFAULT '', vaccine_name TEXT NOT NULL,
        scheduled_date TEXT NOT NULL, administered_date TEXT,
        dose_number INTEGER DEFAULT 1, notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.execute("""CREATE TABLE IF NOT EXISTS dev_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        child_name TEXT DEFAULT '', milestone TEXT NOT NULL,
        category TEXT DEFAULT 'motor' CHECK(category IN ('motor','cognitive','social','language')),
        achieved_date TEXT, expected_age_months INTEGER, notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id))""")

    db.commit()
    db.close()

init_db()

# ─── Auth helpers ──────────────────────────────────────────────────────────────

def hash_password(pw: str) -> str:
    return hashlib.sha256((app.config["SECRET_KEY"][:16] + pw).encode()).hexdigest()

def make_token(user_id: int) -> str:
    import base64
    payload = json.dumps({"user_id": user_id, "exp": (datetime.utcnow() + timedelta(days=30)).isoformat()})
    return base64.urlsafe_b64encode(payload.encode()).decode()

def decode_token(token: str):
    import base64
    try:
        payload = json.loads(base64.urlsafe_b64decode(token.encode()).decode())
        if datetime.fromisoformat(payload["exp"]) < datetime.utcnow(): return None
        return payload["user_id"]
    except: return None

def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_id = decode_token(token)
        if not user_id: return jsonify({"error": "Unauthorized"}), 401
        g.user_id = user_id
        return f(*args, **kwargs)
    return wrapper

# ─── Auth Routes ───────────────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email","").strip().lower()
    password = data.get("password","").strip()
    name = data.get("name","").strip()
    baby_name = data.get("baby_name","").strip()
    if not email or not password or not name:
        return jsonify({"error":"Email, password, and name are required"}), 400
    if len(password) < 4:
        return jsonify({"error":"Password must be at least 4 characters"}), 400
    db = get_db()
    if db.execute("SELECT id FROM users WHERE email=?",(email,)).fetchone():
        return jsonify({"error":"Email already registered"}), 409
    db.execute("INSERT INTO users (email,password_hash,name,baby_name) VALUES (?,?,?,?)",
               (email,hash_password(password),name,baby_name))
    db.commit()
    user = db.execute("SELECT id FROM users WHERE email=?",(email,)).fetchone()
    # Auto-create default child
    db.execute("INSERT INTO children (user_id,name) VALUES (?,?)",(user["id"],baby_name or "Baby"))
    db.commit()
    token = make_token(user["id"])
    return jsonify({"token":token,"user":{"id":user["id"],"email":email,"name":name,"baby_name":baby_name}})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email","").strip().lower()
    password = data.get("password","").strip()
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email=?",(email,)).fetchone()
    if not user or user["password_hash"] != hash_password(password):
        return jsonify({"error":"Invalid email or password"}), 401
    token = make_token(user["id"])
    return jsonify({"token":token,"user":{"id":user["id"],"email":user["email"],"name":user["name"],"baby_name":user["baby_name"]}})

@app.route("/api/me", methods=["GET"])
@auth_required
def me():
    db = get_db()
    user = db.execute("SELECT id,email,name,baby_name,created_at FROM users WHERE id=?",(g.user_id,)).fetchone()
    children = db.execute("SELECT * FROM children WHERE user_id=?",(g.user_id,)).fetchall()
    return jsonify({"user":dict(user),"children":[dict(c) for c in children]})

# ─── Children ──────────────────────────────────────────────────────────────────

@app.route("/api/children", methods=["GET"])
@auth_required
def get_children():
    db = get_db()
    children = db.execute("SELECT * FROM children WHERE user_id=? ORDER BY id",(g.user_id,)).fetchall()
    return jsonify([dict(c) for c in children])

@app.route("/api/children", methods=["POST"])
@auth_required
def add_child():
    data = request.get_json()
    name = data.get("name","").strip()
    if not name: return jsonify({"error":"Name required"}), 400
    db = get_db()
    db.execute("INSERT INTO children (user_id,name,birth_date,gender) VALUES (?,?,?,?)",
               (g.user_id,name,data.get("birth_date",""),data.get("gender","")))
    db.commit()
    cid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    child = db.execute("SELECT * FROM children WHERE id=?",(cid,)).fetchone()
    return jsonify(dict(child)), 201

@app.route("/api/children/<int:child_id>", methods=["DELETE"])
@auth_required
def delete_child(child_id):
    db = get_db()
    child = db.execute("SELECT * FROM children WHERE id=? AND user_id=?",(child_id,g.user_id)).fetchone()
    if not child: return jsonify({"error":"Not found"}), 404
    db.execute("DELETE FROM children WHERE id=?",(child_id,))
    db.commit()
    return jsonify({"ok":True})

# ─── Feedings ──────────────────────────────────────────────────────────────────

@app.route("/api/feedings", methods=["GET"])
@auth_required
def get_feedings():
    db = get_db()
    child = request.args.get("child","")
    if child:
        rows = db.execute("SELECT * FROM feedings WHERE user_id=? AND child_name=? ORDER BY feed_time DESC LIMIT 200",(g.user_id,child)).fetchall()
    else:
        rows = db.execute("SELECT * FROM feedings WHERE user_id=? ORDER BY feed_time DESC LIMIT 200",(g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/feedings", methods=["POST"])
@auth_required
def add_feeding():
    data = request.get_json()
    feed_type = data.get("feed_type","").strip()
    food_name = data.get("food_name","").strip()
    quantity = data.get("quantity")
    unit = data.get("unit","ml").strip()
    feed_time = data.get("feed_time","").strip()
    child_name = data.get("child_name","").strip()
    if feed_type not in ("milk","food"): return jsonify({"error":"feed_type must be 'milk' or 'food'"}), 400
    if feed_type=="food" and not food_name: return jsonify({"error":"food_name required for food"}), 400
    if not quantity or float(quantity)<=0: return jsonify({"error":"Valid quantity required"}), 400
    if not feed_time: feed_time = datetime.utcnow().isoformat()
    db = get_db()
    db.execute("INSERT INTO feedings (user_id,child_name,feed_type,food_name,quantity,unit,feed_time) VALUES (?,?,?,?,?,?,?)",
               (g.user_id,child_name,feed_type,food_name,float(quantity),unit,feed_time))
    db.commit()
    fid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify(dict(db.execute("SELECT * FROM feedings WHERE id=?",(fid,)).fetchone())), 201

@app.route("/api/feedings/stats", methods=["GET"])
@auth_required
def get_feed_stats():
    db = get_db()
    child = request.args.get("child","")
    if child:
        rows = db.execute("""SELECT date(feed_time) as day,
            SUM(CASE WHEN feed_type='milk' THEN quantity ELSE 0 END) as milk_ml,
            SUM(CASE WHEN feed_type='food' THEN quantity ELSE 0 END) as food_qty,
            COUNT(*) as total_feedings
            FROM feedings WHERE user_id=? AND child_name=? GROUP BY date(feed_time) ORDER BY day ASC LIMIT 30""",(g.user_id,child)).fetchall()
        total = db.execute("SELECT COUNT(*) as total, SUM(quantity) as total_qty FROM feedings WHERE user_id=? AND child_name=?",(g.user_id,child)).fetchone()
    else:
        rows = db.execute("""SELECT date(feed_time) as day,
            SUM(CASE WHEN feed_type='milk' THEN quantity ELSE 0 END) as milk_ml,
            SUM(CASE WHEN feed_type='food' THEN quantity ELSE 0 END) as food_qty,
            COUNT(*) as total_feedings
            FROM feedings WHERE user_id=? GROUP BY date(feed_time) ORDER BY day ASC LIMIT 30""",(g.user_id,)).fetchall()
        total = db.execute("SELECT COUNT(*) as total, SUM(quantity) as total_qty FROM feedings WHERE user_id=?",(g.user_id,)).fetchone()
    return jsonify({"daily":[dict(r) for r in rows],"total_feedings":total["total"] or 0,"total_quantity":total["total_qty"] or 0})

# ─── Growth ────────────────────────────────────────────────────────────────────

@app.route("/api/growth", methods=["GET"])
@auth_required
def get_growth():
    db = get_db()
    child = request.args.get("child","")
    if child: rows = db.execute("SELECT * FROM growth_logs WHERE user_id=? AND child_name=? ORDER BY recorded_at DESC LIMIT 200",(g.user_id,child)).fetchall()
    else: rows = db.execute("SELECT * FROM growth_logs WHERE user_id=? ORDER BY recorded_at DESC LIMIT 200",(g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/growth", methods=["POST"])
@auth_required
def add_growth():
    data = request.get_json()
    if not data.get("recorded_at","").strip(): return jsonify({"error":"Date required"}), 400
    db = get_db()
    db.execute("INSERT INTO growth_logs (user_id,child_name,height_cm,weight_kg,head_circumference_cm,recorded_at,notes) VALUES (?,?,?,?,?,?,?)",
               (g.user_id,data.get("child_name",""),data.get("height_cm"),data.get("weight_kg"),data.get("head_circumference_cm"),data["recorded_at"],data.get("notes","")))
    db.commit()
    fid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify(dict(db.execute("SELECT * FROM growth_logs WHERE id=?",(fid,)).fetchone())), 201

# ─── Sleep ─────────────────────────────────────────────────────────────────────

@app.route("/api/sleep", methods=["GET"])
@auth_required
def get_sleep():
    db = get_db()
    child = request.args.get("child","")
    if child: rows = db.execute("SELECT * FROM sleep_logs WHERE user_id=? AND child_name=? ORDER BY start_time DESC LIMIT 200",(g.user_id,child)).fetchall()
    else: rows = db.execute("SELECT * FROM sleep_logs WHERE user_id=? ORDER BY start_time DESC LIMIT 200",(g.user_id,)).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        try:
            start = datetime.fromisoformat(d["start_time"])
            end = datetime.fromisoformat(d["end_time"])
            d["duration_minutes"] = round((end - start).total_seconds() / 60)
        except: d["duration_minutes"] = 0
        result.append(d)
    return jsonify(result)

@app.route("/api/sleep", methods=["POST"])
@auth_required
def add_sleep():
    data = request.get_json()
    sleep_type = data.get("sleep_type","").strip()
    start_time = data.get("start_time","").strip()
    end_time = data.get("end_time","").strip()
    if sleep_type not in ("nap","nighttime"): return jsonify({"error":"sleep_type must be 'nap' or 'nighttime'"}), 400
    if not start_time or not end_time: return jsonify({"error":"start_time and end_time required"}), 400
    db = get_db()
    db.execute("INSERT INTO sleep_logs (user_id,child_name,start_time,end_time,sleep_type,quality,notes) VALUES (?,?,?,?,?,?,?)",
               (g.user_id,data.get("child_name",""),start_time,end_time,sleep_type,data.get("quality","good"),data.get("notes","")))
    db.commit()
    fid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify(dict(db.execute("SELECT * FROM sleep_logs WHERE id=?",(fid,)).fetchone())), 201

# ─── Diaper ────────────────────────────────────────────────────────────────────

@app.route("/api/diaper", methods=["GET"])
@auth_required
def get_diaper():
    db = get_db()
    child = request.args.get("child","")
    if child: rows = db.execute("SELECT * FROM diaper_logs WHERE user_id=? AND child_name=? ORDER BY recorded_at DESC LIMIT 200",(g.user_id,child)).fetchall()
    else: rows = db.execute("SELECT * FROM diaper_logs WHERE user_id=? ORDER BY recorded_at DESC LIMIT 200",(g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/diaper", methods=["POST"])
@auth_required
def add_diaper():
    data = request.get_json()
    diaper_type = data.get("diaper_type","").strip()
    if diaper_type not in ("wet","dirty","both"): return jsonify({"error":"diaper_type must be 'wet','dirty', or 'both'"}), 400
    if not data.get("recorded_at","").strip(): return jsonify({"error":"Date required"}), 400
    db = get_db()
    db.execute("INSERT INTO diaper_logs (user_id,child_name,diaper_type,color,consistency,recorded_at,notes) VALUES (?,?,?,?,?,?,?)",
               (g.user_id,data.get("child_name",""),diaper_type,data.get("color",""),data.get("consistency",""),data["recorded_at"],data.get("notes","")))
    db.commit()
    fid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify(dict(db.execute("SELECT * FROM diaper_logs WHERE id=?",(fid,)).fetchone())), 201

@app.route("/api/diaper/stats", methods=["GET"])
@auth_required
def get_diaper_stats():
    db = get_db()
    child = request.args.get("child","")
    if child:
        rows = db.execute("""SELECT date(recorded_at) as day, COUNT(*) as total,
            SUM(CASE WHEN diaper_type IN ('wet','both') THEN 1 ELSE 0 END) as wet,
            SUM(CASE WHEN diaper_type IN ('dirty','both') THEN 1 ELSE 0 END) as dirty
            FROM diaper_logs WHERE user_id=? AND child_name=? GROUP BY day ORDER BY day ASC LIMIT 14""",(g.user_id,child)).fetchall()
    else:
        rows = db.execute("""SELECT date(recorded_at) as day, COUNT(*) as total,
            SUM(CASE WHEN diaper_type IN ('wet','both') THEN 1 ELSE 0 END) as wet,
            SUM(CASE WHEN diaper_type IN ('dirty','both') THEN 1 ELSE 0 END) as dirty
            FROM diaper_logs WHERE user_id=? GROUP BY day ORDER BY day ASC LIMIT 14""",(g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

# ─── Temperature ───────────────────────────────────────────────────────────────

@app.route("/api/temperature", methods=["GET"])
@auth_required
def get_temperature():
    db = get_db()
    child = request.args.get("child","")
    if child: rows = db.execute("SELECT * FROM temp_logs WHERE user_id=? AND child_name=? ORDER BY recorded_at DESC LIMIT 100",(g.user_id,child)).fetchall()
    else: rows = db.execute("SELECT * FROM temp_logs WHERE user_id=? ORDER BY recorded_at DESC LIMIT 100",(g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/temperature", methods=["POST"])
@auth_required
def add_temperature():
    data = request.get_json()
    temp = data.get("temperature")
    if not temp or float(temp) <= 0: return jsonify({"error":"Valid temperature required"}), 400
    if not data.get("recorded_at","").strip(): return jsonify({"error":"Date required"}), 400
    db = get_db()
    db.execute("INSERT INTO temp_logs (user_id,child_name,temperature,unit,method,symptoms,recorded_at,notes) VALUES (?,?,?,?,?,?,?,?)",
               (g.user_id,data.get("child_name",""),float(temp),data.get("unit","F"),data.get("method","oral"),data.get("symptoms",""),data["recorded_at"],data.get("notes","")))
    db.commit()
    fid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify(dict(db.execute("SELECT * FROM temp_logs WHERE id=?",(fid,)).fetchone())), 201

# ─── Vaccinations ──────────────────────────────────────────────────────────────

@app.route("/api/vaccinations", methods=["GET"])
@auth_required
def get_vaccinations():
    db = get_db()
    child = request.args.get("child","")
    if child: rows = db.execute("SELECT * FROM vaccinations WHERE user_id=? AND child_name=? ORDER BY scheduled_date ASC",(g.user_id,child)).fetchall()
    else: rows = db.execute("SELECT * FROM vaccinations WHERE user_id=? ORDER BY scheduled_date ASC",(g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/vaccinations", methods=["POST"])
@auth_required
def add_vaccination():
    data = request.get_json()
    if not data.get("vaccine_name","").strip(): return jsonify({"error":"Vaccine name required"}), 400
    if not data.get("scheduled_date","").strip(): return jsonify({"error":"Scheduled date required"}), 400
    db = get_db()
    db.execute("INSERT INTO vaccinations (user_id,child_name,vaccine_name,scheduled_date,administered_date,dose_number,notes) VALUES (?,?,?,?,?,?,?)",
               (g.user_id,data.get("child_name",""),data["vaccine_name"],data["scheduled_date"],data.get("administered_date"),data.get("dose_number",1),data.get("notes","")))
    db.commit()
    fid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify(dict(db.execute("SELECT * FROM vaccinations WHERE id=?",(fid,)).fetchone())), 201

@app.route("/api/vaccinations/<int:vax_id>", methods=["PUT"])
@auth_required
def update_vaccination(vax_id):
    data = request.get_json()
    db = get_db()
    vax = db.execute("SELECT * FROM vaccinations WHERE id=? AND user_id=?",(vax_id,g.user_id)).fetchone()
    if not vax: return jsonify({"error":"Not found"}), 404
    db.execute("UPDATE vaccinations SET administered_date=?, notes=? WHERE id=?",
               (data.get("administered_date",vax["administered_date"]),data.get("notes",vax["notes"]),vax_id))
    db.commit()
    return jsonify(dict(db.execute("SELECT * FROM vaccinations WHERE id=?",(vax_id,)).fetchone()))

# ─── Developmental Milestones ──────────────────────────────────────────────────

@app.route("/api/milestones", methods=["GET"])
@auth_required
def get_milestones():
    db = get_db()
    child = request.args.get("child","")
    if child: rows = db.execute("SELECT * FROM dev_milestones WHERE user_id=? AND child_name=? ORDER BY expected_age_months ASC",(g.user_id,child)).fetchall()
    else: rows = db.execute("SELECT * FROM dev_milestones WHERE user_id=? ORDER BY expected_age_months ASC",(g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/milestones", methods=["POST"])
@auth_required
def add_milestone():
    data = request.get_json()
    if not data.get("milestone","").strip(): return jsonify({"error":"Milestone name required"}), 400
    db = get_db()
    db.execute("INSERT INTO dev_milestones (user_id,child_name,milestone,category,achieved_date,expected_age_months,notes) VALUES (?,?,?,?,?,?,?)",
               (g.user_id,data.get("child_name",""),data["milestone"],data.get("category","motor"),data.get("achieved_date"),data.get("expected_age_months"),data.get("notes","")))
    db.commit()
    fid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify(dict(db.execute("SELECT * FROM dev_milestones WHERE id=?",(fid,)).fetchone())), 201

# ─── Dashboard Summary ─────────────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@auth_required
def dashboard():
    db = get_db()
    child = request.args.get("child","")
    today = datetime.utcnow().strftime("%Y-%m-%d")

    def q(sql, params):
        return db.execute(sql, params).fetchone()

    if child:
        today_feeds = q("SELECT COUNT(*) as cnt, SUM(quantity) as total FROM feedings WHERE user_id=? AND child_name=? AND date(feed_time)=?",(g.user_id,child,today))
        today_sleep = q("SELECT COUNT(*) as cnt, SUM((julianday(end_time)-julianday(start_time))*24*60) as total_min FROM sleep_logs WHERE user_id=? AND child_name=? AND date(start_time)=?",(g.user_id,child,today))
        today_diapers = q("SELECT COUNT(*) as cnt FROM diaper_logs WHERE user_id=? AND child_name=? AND date(recorded_at)=?",(g.user_id,child,today))
        latest_growth = q("SELECT * FROM growth_logs WHERE user_id=? AND child_name=? ORDER BY recorded_at DESC LIMIT 1",(g.user_id,child))
        upcoming_vax = db.execute("SELECT * FROM vaccinations WHERE user_id=? AND child_name=? AND administered_date IS NULL AND scheduled_date >= ? ORDER BY scheduled_date ASC LIMIT 3",(g.user_id,child,today)).fetchall()
        recent_temp = q("SELECT * FROM temp_logs WHERE user_id=? AND child_name=? ORDER BY recorded_at DESC LIMIT 1",(g.user_id,child))
    else:
        today_feeds = q("SELECT COUNT(*) as cnt, SUM(quantity) as total FROM feedings WHERE user_id=? AND date(feed_time)=?",(g.user_id,today))
        today_sleep = q("SELECT COUNT(*) as cnt, SUM((julianday(end_time)-julianday(start_time))*24*60) as total_min FROM sleep_logs WHERE user_id=? AND date(start_time)=?",(g.user_id,today))
        today_diapers = q("SELECT COUNT(*) as cnt FROM diaper_logs WHERE user_id=? AND date(recorded_at)=?",(g.user_id,today))
        latest_growth = q("SELECT * FROM growth_logs WHERE user_id=? ORDER BY recorded_at DESC LIMIT 1",(g.user_id,))
        upcoming_vax = db.execute("SELECT * FROM vaccinations WHERE user_id=? AND administered_date IS NULL AND scheduled_date >= ? ORDER BY scheduled_date ASC LIMIT 3",(g.user_id,today)).fetchall()
        recent_temp = q("SELECT * FROM temp_logs WHERE user_id=? ORDER BY recorded_at DESC LIMIT 1",(g.user_id,))

    return jsonify({
        "today": {
            "feedings_count": today_feeds["cnt"] or 0,
            "feedings_total": round(today_feeds["total"] or 0, 1),
            "sleep_sessions": today_sleep["cnt"] or 0,
            "sleep_minutes": round(today_sleep["total_min"] or 0),
            "diapers": today_diapers["cnt"] or 0,
        },
        "latest_growth": dict(latest_growth) if latest_growth else None,
        "upcoming_vaccines": [dict(v) for v in upcoming_vax],
        "recent_temperature": dict(recent_temp) if recent_temp else None,
    })

# ─── Health ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status":"ok","version":"2.0-phase4"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)
