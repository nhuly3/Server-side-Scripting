# Stock Lookup App

A Flask-based web application that retrieves company and stock data from the Tiingo API, caches responses in SQLite (15-minute TTL), and displays in a styled, tabbed interface. Includes search history.

## Setup

1. Unzip the project:
   ```bash
   unzip stock_lookup_app.zip
   cd stock_lookup_app
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Populate `.env` with your Tiingo API key:
   ```
   TIINGO_API_KEY=your_tiingo_api_token_here
   ```

5. Run the application:
   ```bash
   python app.py
   ```

6. Open in browser: http://localhost:8000/
