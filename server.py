import os
import json
import sqlite3
import urllib.request
import urllib.error
from flask import Flask, request, jsonify

app = Flask(__name__, static_folder=".", static_url_path="")
DATABASE = 'data.db'

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # Stores the entire user profile state as JSON
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state_data TEXT
        )
    ''')
    # Stores persistent chat messages
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            message_text TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check if a default profile row exists
    cursor.execute("SELECT COUNT(*) FROM user_profile")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO user_profile (id, state_data) VALUES (1, '{}')")
        
    conn.commit()
    conn.close()

# Helper to run database operations
def db_query(query, args=(), one=False, commit=False):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(query, args)
    
    if commit:
        conn.commit()
        conn.close()
        return True
        
    rv = cursor.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv

@app.route("/")
def index():
    return app.send_static_file("index.html")

# --- PROFILE ENDPOINTS ---
@app.route("/api/profile", methods=["GET"])
def get_profile():
    row = db_query("SELECT state_data FROM user_profile WHERE id = 1", one=True)
    if row:
        return jsonify(json.loads(row["state_data"]))
    return jsonify({})

@app.route("/api/profile", methods=["POST"])
def save_profile():
    state_data = request.json
    if not state_data:
        return jsonify({"error": "Invalid profile payload"}), 400
        
    db_query("UPDATE user_profile SET state_data = ? WHERE id = 1", (json.dumps(state_data),), commit=True)
    return jsonify({"success": True})

# --- CHAT HISTORY ENDPOINTS ---
@app.route("/api/chat", methods=["GET"])
def get_chat():
    rows = db_query("SELECT sender, message_text FROM chat_history ORDER BY id ASC")
    chat_list = [{"sender": row["sender"], "text": row["message_text"]} for row in rows]
    return jsonify(chat_list)

@app.route("/api/chat", methods=["POST"])
def save_chat_message():
    payload = request.json
    sender = payload.get("sender")
    text = payload.get("text")
    if not sender or not text:
        return jsonify({"error": "Missing message details"}), 400
        
    db_query("INSERT INTO chat_history (sender, message_text) VALUES (?, ?)", (sender, text), commit=True)
    return jsonify({"success": True})

@app.route("/api/chat/clear", methods=["POST"])
def clear_chat():
    db_query("DELETE FROM chat_history", commit=True)
    return jsonify({"success": True})

# --- GEMINI AI PROXY ENDPOINT ---
@app.route("/api/advisor", methods=["POST"])
def ai_advisor():
    payload = request.json
    user_message = payload.get("message")
    history = payload.get("history", [])
    footprint = payload.get("footprint", {})
    client_key = payload.get("apiKey")  # optional key provided by client

    if not user_message:
        return jsonify({"error": "Missing user message"}), 400

    # 1. Resolve API Key: Prefer Server Environment Variable, fallback to Client user-pasted key
    server_key = os.environ.get("GEMINI_API_KEY")
    api_key = server_key if server_key else client_key

    if not api_key:
        return jsonify({
            "error": "Gemini API Key is not configured. Configure GEMINI_API_KEY environment variable on the server or provide a key in the settings panel."
        }), 400

    # 2. Formulate Context Prompt
    system_prompt = f"""You are Aura Eco-Advisor, a friendly, highly intelligent, and supportive AI environmental consultant.
The user is utilizing the Aura Carbon Awareness Platform to track and reduce their carbon footprint.

Here is the user's active carbon footprint profile:
- Total Footprint: {(footprint.get('total', 0) / 1000):.1f} tonnes CO2e/year.
- Home Utility Energy: {footprint.get('breakdown', {}).get('energy', 0):,} kg CO2e/year.
- Transportation/Commute: {footprint.get('breakdown', {}).get('transport', 0):,} kg CO2e/year.
- Food & Diet: {footprint.get('breakdown', {}).get('food', 0):,} kg CO2e/year.
- Household Waste & Recycling: {footprint.get('breakdown', {}).get('waste', 0):,} kg CO2e/year.

Guidelines for your response:
1. Be encouraging and focus on positive, actionable steps.
2. Refer to their specific footprint metrics when they ask questions (e.g., if their transport emissions are high, suggest custom transport options).
3. Provide answers formatted in clean markdown (bullet points, bold text).
4. Keep responses concise and practical (around 2-3 short paragraphs or clean lists).
5. Do not make up facts. Use scientific guidelines aligned with IPCC, EPA, and DEFRA.
"""

  # 3. Construct Contents Payload
    contents = []
    for msg in history:
        contents.append({
            "role": "user" if msg.get("role") == "user" else "model",
            "parts": [{"text": msg.get("text")}]
        })

    context_message = f"[Eco-Advisor Context - System Instructions: {system_prompt}]\n\nUser Message: {user_message}"
    contents.append({
        "role": "user",
        "parts": [{"text": context_message}]
    })

    # 4. Make HTTP Post call to Gemini endpoint
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    req_body = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 800
        }
    }

    req = urllib.request.Request(
        gemini_url,
        data=json.dumps(req_body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            text_response = res_data['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"response": text_response})
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        try:
            err_json = json.loads(err_msg)
            msg = err_json.get('error', {}).get('message', err_msg)
        except Exception:
            msg = f"HTTP Error {e.code}"
        return jsonify({"error": f"Gemini API Error: {msg}"}), 500
    except Exception as e:
        return jsonify({"error": f"Connection Error: {str(e)}"}), 500

if __name__ == "__main__":
    init_db()
    # Run server locally on port 8000
    app.run(host="127.0.0.1", port=8000, debug=True)
