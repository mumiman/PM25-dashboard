# Setup Guide for PM2.5 Dashboard on MacBook

This guide will help you run the PM2.5 Dashboard project locally on your MacBook.

## Prerequisites

Ensure you have the following installed:

1.  **Node.js & npm**: Download from [nodejs.org](https://nodejs.org/).
2.  **Python 3.8+**: Download from [python.org](https://www.python.org/).

## Step 1: Backend Setup

The backend is built with Python (FastAPI).

1.  **Navigate to the project directory** (if not already there):
    ```bash
    cd /Users/mac/Library/CloudStorage/OneDrive-Personal/_odpc6/Project/EnvOc/PM25-dashboard
    ```

2.  **Create a virtual environment** (recommended):
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r backend/requirements.txt
    ```
    *Note: You may need to install `uvicorn` explicitly if it's not in requirements.txt:*
    ```bash
    pip install uvicorn
    ```

4.  **Run the Backend Server**:
    In the root directory, run:
    ```bash
    cd backend
    python3 -m uvicorn main:app --host 0.0.0.0 --port 3009 --reload
    ```
    The server will start at `http://0.0.0.0:3009`.

## Step 2: Frontend Setup

The frontend is built with React and Vite.

1.  **Open a new terminal window/tab**.

2.  **Navigate to the project directory**:
    ```bash
    cd /Users/mac/Library/CloudStorage/OneDrive-Personal/_odpc6/Project/EnvOc/PM25-dashboard
    ```

3.  **Install dependencies**:
    ```bash
    npm install
    ```

4.  **Run the Frontend Development Server**:
    ```bash
    npm run dev
    ```
    The terminal will show a local URL (e.g., `http://localhost:5173`). Open this link in your browser.

## Troubleshooting

-   **Port Conflicts**: If port 3009 is already in use, you may need to kill the process using it or change the port in `backend/main.py` and `vite.config.ts`.
-   **Missing Dependencies**: If you encounter errors about missing modules, double-check that you have run `pip install` and `npm install` successfully.
