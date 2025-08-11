import os
import sqlite3
import json
from datetime import datetime, timedelta
from flask import Flask, jsonify, render_template
import requests
from dotenv import load_dotenv

# Load API key
load_dotenv()
API_KEY = os.getenv('TIINGO_API_KEY')
DB_PATH = 'search_history.db'
CACHE_TTL = timedelta(minutes=15)

app = Flask(__name__)

# Initialize database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS SearchHistory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS CachedStockData (
            ticker TEXT PRIMARY KEY,
            company_json TEXT,
            stock_json TEXT,
            last_updated DATETIME
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Cache helpers
def get_cached(ticker):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT company_json, stock_json, last_updated FROM CachedStockData WHERE ticker=?', (ticker,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    company_json, stock_json, last_updated = row
    last_time = datetime.fromisoformat(last_updated)
    if datetime.utcnow() - last_time < CACHE_TTL:
        return {'company': json.loads(company_json), 'stock': json.loads(stock_json)}
    return None

def set_cache(ticker, comp, stock):
    conn = sqlite3.connect(DB_PATH)
    now = datetime.utcnow().isoformat()
    conn.execute('''
        INSERT INTO CachedStockData (ticker, company_json, stock_json, last_updated)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(ticker) DO UPDATE SET
            company_json=excluded.company_json,
            stock_json=excluded.stock_json,
            last_updated=excluded.last_updated
    ''', (ticker, json.dumps(comp), json.dumps(stock), now))
    conn.commit()
    conn.close()

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/stock/<ticker>')
def stock_data(ticker):
    ticker = ticker.upper()
    data = get_cached(ticker)
    served_from_cache = True
    if not data:
        served_from_cache = False
        comp_url = f'https://api.tiingo.com/tiingo/daily/{ticker}?token={API_KEY}'
        res1 = requests.get(comp_url)
        if res1.status_code != 200:
            return jsonify({'error': 'No record has been found, please enter a valid symbol.'}), 404
        company = res1.json()
        summ_url = f'https://api.tiingo.com/iex/{ticker}?token={API_KEY}'
        res2 = requests.get(summ_url)
        if res2.status_code != 200:
            return jsonify({'error': 'No record has been found, please enter a valid symbol.'}), 404
        stock = res2.json()
        data = {'company': company, 'stock': stock}
        set_cache(ticker, company, stock)
    if not served_from_cache:
        conn = sqlite3.connect(DB_PATH)
        conn.execute('INSERT INTO SearchHistory (ticker) VALUES (?)', (ticker,))
        conn.commit()
        conn.close()
    return jsonify({'data': data, 'cached': served_from_cache})

@app.route('/history')
def history():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT ticker, timestamp FROM SearchHistory ORDER BY id DESC LIMIT 10')
    rows = cur.fetchall()
    conn.close()
    history = [{'ticker': r[0], 'timestamp': r[1]} for r in rows]
    return jsonify(history)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
