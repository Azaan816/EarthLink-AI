# EarthLink AI

EarthLink AI is a geospatial intelligence application that provides environmental insights using a map-based interface.

## Project Structure

- **frontend/**: A [Next.js](https://nextjs.org) application using Mapbox for visualization and Vercel AI SDK for chat.
- **backend/**: A [FastAPI](https://fastapi.tiangolo.com) server serving environmental data and insights (MCP Server).

## Getting Started

To run this project, you need to set up and run both the **Backend** and the **Frontend** simultaneously.

### 1. Prerequisites
- **Node.js & npm** (for the frontend)
- **Python 3.10+** (for the backend)
- **Mapbox API Key** (in `.env.local`)
- **Google Gemini API Key** (in `.env.local`)

### 2. Run the Backend

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  (Optional) Create and activate a Python virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the server:
    ```bash
    uvicorn main:app --reload
    ```
    The backend runs on `http://localhost:8000`.

### 3. Run the Frontend

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The frontend runs on `http://localhost:3000`.

### 4. Usage
- Open `http://localhost:3000`.
- Click a point on the map (e.g., in San Francisco).
- Use the "Ask about this" chat feature to get insights.

## Environment Variables

Ensure `frontend/.env.local` contains:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.***
GOOGLE_GENERATIVE_AI_API_KEY=***
NEXT_PUBLIC_TAMBO_API_KEY=***
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```
