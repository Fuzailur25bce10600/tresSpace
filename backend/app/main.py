
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.celestrak import load_satellites
from app.services.position_cache import load_position_cache
from app.services.collision_detection import detect_close_approaches

from app.services.avoidance import (
    evaluate_avoidance,
    evaluate_detected_encounter,
    optimize_detected_encounter
)


app = FastAPI(
    title="tresSpace API",
    description="Satellite Tracking and Orbital Intelligence",
    version="1.0.0"
)


# =====================================================
# CORS
# =====================================================


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# =====================================================
# REQUEST MODELS
# =====================================================

class AvoidanceRequest(BaseModel):
    position_a: list[float] = Field(min_length=3, max_length=3)
    velocity_a: list[float] = Field(min_length=3, max_length=3)
    position_b: list[float] = Field(min_length=3, max_length=3)
    velocity_b: list[float] = Field(min_length=3, max_length=3)
    delta_v: list[float] = Field(min_length=3, max_length=3)

    initial_mass: float = Field(gt=0)
    specific_impulse: float = Field(gt=0)

    safety_threshold_km: float = Field(default=5, gt=0)
    duration_seconds: float = Field(default=3600, gt=0)


class EncounterEvaluationRequest(BaseModel):
    encounter: dict
    delta_v: list[float] = Field(min_length=3, max_length=3)

    initial_mass: float = Field(default=500, gt=0)
    specific_impulse: float = Field(default=220, gt=0)
    safety_threshold_km: float = Field(default=5, gt=0)


class EncounterOptimizationRequest(BaseModel):
    encounter: dict

    initial_mass: float = Field(default=500, gt=0)
    specific_impulse: float = Field(default=220, gt=0)
    safety_threshold_km: float = Field(default=5, gt=0)

    max_delta_v: float = Field(default=1, gt=0)
    step_size: float = Field(default=0.1, gt=0)


# =====================================================
# HOME
# =====================================================

@app.get("/")
def home():
    return {
        "project": "tresSpace",
        "message": "Satellite tracking API is running",
        "status": "Operational"
    }


# =====================================================
# DASHBOARD
# =====================================================

@app.get("/api/dashboard")
def dashboard():

    satellites = load_satellites()
    positions = load_position_cache()

    return {
        "orbital_records": len(satellites),
        "objects_with_cached_positions": len(positions),
        "collision_alerts": None,
        "collision_alerts_note": "Run collision screening to calculate alerts.",
        "system_status": "Operational"
    }


# =====================================================
# SATELLITE DATA
# =====================================================

@app.get("/api/satellites")
def get_satellites():

    positions = load_position_cache()

    if not positions:
        raise HTTPException(
            status_code=404,
            detail="Position cache is empty. Run position_cache.py first."
        )

    return {
        "count": len(positions),
        "satellites": positions
    }


# =====================================================
# COLLISION DETECTION
# =====================================================

@app.get("/api/collisions")
def get_collisions(
    time_window_hours: float = 6,
    time_step_seconds: int = 60,
    threshold_km: float = 10
):

    try:
        results = detect_close_approaches(
            time_window_hours=time_window_hours,
            time_step_seconds=time_step_seconds,
            threshold_km=threshold_km
        )

        alerts = [
            item for item in results
            if item["screening_status"] == "CLOSE_APPROACH"
        ]

        return {
            "total_pairs_screened": len(results),
            "total_close_approaches": len(alerts),
            "threshold_km": threshold_km,
            "alerts": alerts,
            "closest_approaches": results[:10]
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# BASIC AVOIDANCE SIMULATION
# =====================================================

@app.post("/api/avoidance/evaluate")
def avoidance_evaluation(request: AvoidanceRequest):

    try:
        result = evaluate_avoidance(
            position_a=request.position_a,
            velocity_a=request.velocity_a,
            position_b=request.position_b,
            velocity_b=request.velocity_b,
            delta_v=request.delta_v,
            initial_mass=request.initial_mass,
            specific_impulse=request.specific_impulse,
            safety_threshold_km=request.safety_threshold_km,
            duration_seconds=request.duration_seconds
        )

        return {
            "status": "success",
            "evaluation": result
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# =====================================================
# AVOIDANCE FOR A DETECTED ENCOUNTER
# =====================================================

@app.post("/api/avoidance/evaluate-encounter")
def evaluate_encounter(request: EncounterEvaluationRequest):

    try:
        result = evaluate_detected_encounter(
            encounter=request.encounter,
            delta_v=request.delta_v,
            initial_mass=request.initial_mass,
            specific_impulse=request.specific_impulse,
            safety_threshold_km=request.safety_threshold_km
        )

        return result

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# =====================================================
# OPTIMISE A DETECTED ENCOUNTER
# =====================================================

@app.post("/api/avoidance/optimize-encounter")
def optimize_encounter(request: EncounterOptimizationRequest):

    try:
        result = optimize_detected_encounter(
            encounter=request.encounter,
            initial_mass=request.initial_mass,
            specific_impulse=request.specific_impulse,
            safety_threshold_km=request.safety_threshold_km,
            max_delta_v=request.max_delta_v,
            step_size=request.step_size
        )

        return result

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
