
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="tresSpace API",
    description="Satellite Tracking and Orbital Intelligence",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/")
def home():
    return {
        "project": "tresSpace",
        "message": "API is running successfully",
        "status": "Operational"
    }


@app.get("/api/dashboard")
def dashboard():
    return {
        "satellites": 1250,
        "tracked_objects": 8500,
        "collision_alerts": 12,
        "system_status": "Operational"
    }
