
import numpy as np
from scipy.integrate import solve_ivp
from datetime import datetime


# Earth's gravitational parameter (km^3/s^2)
MU = 398600.4418


# =====================================================
# 1. ORBITAL DYNAMICS
# =====================================================

def orbital_dynamics(time, state):
    """
    Calculate satellite acceleration under Earth's gravity.
    State = [x, y, z, vx, vy, vz]
    """

    position = state[:3]
    velocity = state[3:]

    distance = np.linalg.norm(position)

    if distance == 0:
        raise ValueError("Satellite position cannot be zero.")

    acceleration = -MU * position / distance**3

    return np.concatenate((velocity, acceleration))


# =====================================================
# 2. TRAJECTORY SIMULATION
# =====================================================

def simulate_maneuver(position, velocity, delta_v, duration=3600):
    """
    Simulate a satellite trajectory after applying delta-v.

    position: km
    velocity: km/s
    delta_v: km/s
    duration: seconds
    """

    if duration <= 0:
        raise ValueError("Duration must be positive.")

    position = np.array(position, dtype=float)
    velocity = np.array(velocity, dtype=float)
    delta_v = np.array(delta_v, dtype=float)

    if position.shape != (3,) or velocity.shape != (3,) or delta_v.shape != (3,):
        raise ValueError("Position, velocity and delta-v must have 3 components.")

    new_velocity = velocity + delta_v

    initial_state = np.concatenate((position, new_velocity))

    # Identical time samples for trajectory comparisons
    time_points = np.linspace(0, duration, 361)

    result = solve_ivp(
        orbital_dynamics,
        (0, duration),
        initial_state,
        t_eval=time_points,
        method="RK45",
        rtol=1e-9,
        atol=1e-9
    )

    if not result.success:
        raise RuntimeError(result.message)

    return {
        "time_seconds": result.t.tolist(),
        "positions_km": result.y[:3].T.tolist(),
        "velocities_km_s": result.y[3:].T.tolist(),
        "success": result.success
    }


# =====================================================
# 3. MINIMUM SEPARATION
# =====================================================

def calculate_minimum_distance(trajectory_a, trajectory_b):
    """
    Find minimum separation between two trajectories.
    """

    positions_a = np.array(trajectory_a["positions_km"])
    positions_b = np.array(trajectory_b["positions_km"])

    if positions_a.shape != positions_b.shape:
        raise ValueError("Trajectories must have matching time samples.")

    distances = np.linalg.norm(
        positions_a - positions_b,
        axis=1
    )

    min_index = np.argmin(distances)

    return {
        "minimum_distance_km": float(distances[min_index]),
        "time_seconds": float(trajectory_a["time_seconds"][min_index])
    }


# =====================================================
# 4. COLLISION RISK ASSESSMENT
# =====================================================

def assess_collision_risk(minimum_distance):

    if minimum_distance < 1:
        return "HIGH RISK"

    elif minimum_distance < 5:
        return "MEDIUM RISK"

    else:
        return "LOW RISK"


# =====================================================
# 5. FUEL CONSUMPTION
# =====================================================

def calculate_fuel_consumption(delta_v, initial_mass, specific_impulse):
    """
    Estimate propellant consumption using the rocket equation.

    delta_v: m/s
    initial_mass: kg
    specific_impulse: seconds
    """

    if initial_mass <= 0 or specific_impulse <= 0:
        raise ValueError("Mass and specific impulse must be positive.")

    g0 = 9.80665

    final_mass = initial_mass / np.exp(
        delta_v / (specific_impulse * g0)
    )

    fuel_used = initial_mass - final_mass

    return {
        "initial_mass_kg": float(initial_mass),
        "final_mass_kg": float(final_mass),
        "fuel_consumed_kg": float(fuel_used)
    }



# 6. INTEGRATED AVOIDANCE EVALUATION


def evaluate_avoidance(
    position_a,
    velocity_a,
    position_b,
    velocity_b,
    delta_v,
    initial_mass,
    specific_impulse,
    safety_threshold_km=5,
    duration_seconds=3600
):
    """
    Evaluate an avoidance manoeuvre.

    delta_v is supplied in km/s.
    """

    # Original trajectory of Satellite A
    trajectory_a = simulate_maneuver(
        position_a,
        velocity_a,
        [0, 0, 0],
        duration=duration_seconds
    )

    # Original trajectory of Satellite B
    trajectory_b = simulate_maneuver(
        position_b,
        velocity_b,
        [0, 0, 0],
        duration=duration_seconds
    )

    # Separation before manoeuvre
    before = calculate_minimum_distance(
        trajectory_a,
        trajectory_b
    )

    # Modified trajectory of Satellite A
    modified_a = simulate_maneuver(
        position_a,
        velocity_a,
        delta_v,
        duration=duration_seconds
    )

    # Separation after manoeuvre
    after = calculate_minimum_distance(
        modified_a,
        trajectory_b
    )

    # Risk assessment
    risk_before = assess_collision_risk(
        before["minimum_distance_km"]
    )

    risk_after = assess_collision_risk(
        after["minimum_distance_km"]
    )

    # Convert delta-v from km/s to m/s
    delta_v_magnitude = (
        np.linalg.norm(np.array(delta_v, dtype=float)) * 1000
    )

    # Fuel calculation
    fuel = calculate_fuel_consumption(
        delta_v_magnitude,
        initial_mass,
        specific_impulse
    )

    improvement = (
        after["minimum_distance_km"]
        - before["minimum_distance_km"]
    )

    if (
        improvement > 0
        and after["minimum_distance_km"] >= safety_threshold_km
    ):
        decision = "MANOEUVRE MEETS SAFETY THRESHOLD"

    elif improvement > 0:
        decision = "SEPARATION IMPROVED, BUT SAFETY THRESHOLD NOT MET"

    else:
        decision = "MANOEUVRE DOES NOT IMPROVE SEPARATION"

    return {
        "before": before,
        "after": after,
        "improvement_km": float(improvement),
        "risk_before": risk_before,
        "risk_after": risk_after,
        "fuel": fuel,
        "delta_v_m_s": float(delta_v_magnitude),
        "decision": decision
    }



# 7. MANOEUVRE OPTIMISATION


def optimize_maneuver(
    position_a,
    velocity_a,
    position_b,
    velocity_b,
    initial_mass,
    specific_impulse,
    safety_threshold_km=5,
    max_delta_v=10,
    step_size=0.1,
    duration_seconds=3600
):
    """
    Search six directions for a low-fuel manoeuvre
    meeting the specified safety threshold.
    """

    if max_delta_v <= 0 or step_size <= 0:
        raise ValueError("Search limits must be positive.")

    best_result = None
    best_delta_v = None

    directions = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1]
    ]

    magnitudes = np.arange(
        step_size,
        max_delta_v + step_size * 0.5,
        step_size
    )

    for direction in directions:

        for magnitude in magnitudes:

            # Convert m/s to km/s
            delta_v = (
                np.array(direction) * magnitude / 1000
            ).tolist()

            result = evaluate_avoidance(
                position_a,
                velocity_a,
                position_b,
                velocity_b,
                delta_v,
                initial_mass,
                specific_impulse,
                safety_threshold_km,
                duration_seconds
            )

            if result["decision"] == "MANOEUVRE MEETS SAFETY THRESHOLD":

                if (
                    best_result is None
                    or result["fuel"]["fuel_consumed_kg"]
                    < best_result["fuel"]["fuel_consumed_kg"]
                ):
                    best_result = result
                    best_delta_v = delta_v

    if best_result is None:
        return {
            "success": False,
            "message": "No suitable manoeuvre found in the tested directions and range."
        }

    return {
        "success": True,
        "delta_v_km_s": best_delta_v,
        "evaluation": best_result
    }



# 8. CONNECT COLLISION DETECTION TO AVOIDANCE


def evaluate_detected_encounter(
    encounter,
    delta_v,
    initial_mass=500,
    specific_impulse=220,
    safety_threshold_km=5
):
    """
    Take an encounter from collision_detection.py
    and evaluate an avoidance manoeuvre.
    """

    if encounter.get("screening_status") != "CLOSE_APPROACH":
        return {
            "success": False,
            "message": "Encounter is not flagged as a close approach."
        }

    initial = encounter.get("initial_state")

    if not initial:
        return {
            "success": False,
            "message": "Initial orbital states unavailable."
        }

    if not encounter.get("screening_start_time"):
        return {
            "success": False,
            "message": "Screening start time unavailable."
        }

    if not encounter.get("time_of_closest_approach"):
        return {
            "success": False,
            "message": "Closest approach time unavailable."
        }

    start_time = datetime.fromisoformat(
        encounter["screening_start_time"]
    )

    closest_time = datetime.fromisoformat(
        encounter["time_of_closest_approach"]
    )

    duration_seconds = (
        closest_time - start_time
    ).total_seconds()

    if duration_seconds <= 0:
        return {
            "success": False,
            "message": "No future manoeuvre simulation time available."
        }

    evaluation = evaluate_avoidance(
        position_a=initial["position_1"],
        velocity_a=initial["velocity_1"],
        position_b=initial["position_2"],
        velocity_b=initial["velocity_2"],
        delta_v=delta_v,
        initial_mass=initial_mass,
        specific_impulse=specific_impulse,
        safety_threshold_km=safety_threshold_km,
        duration_seconds=duration_seconds
    )

    return {
        "success": True,
        "object_1": encounter["object_1"],
        "object_2": encounter["object_2"],
        "time_to_encounter_seconds": duration_seconds,
        "original_screening_distance_km": encounter["closest_approach_km"],
        "avoidance_evaluation": evaluation
    }


# 9. OPTIMISE AN ACTUAL DETECTED ENCOUNTER


def optimize_detected_encounter(
    encounter,
    initial_mass=500,
    specific_impulse=220,
    safety_threshold_km=5,
    max_delta_v=10,
    step_size=0.1
):
    """
    Optimise a manoeuvre using an actual detected encounter.
    """

    if encounter.get("screening_status") != "CLOSE_APPROACH":
        return {
            "success": False,
            "message": "Encounter is not flagged as a close approach."
        }

    initial = encounter.get("initial_state")

    if not initial:
        return {
            "success": False,
            "message": "Initial orbital states unavailable."
        }

    start_time = datetime.fromisoformat(
        encounter["screening_start_time"]
    )

    closest_time = datetime.fromisoformat(
        encounter["time_of_closest_approach"]
    )

    duration_seconds = (
        closest_time - start_time
    ).total_seconds()

    if duration_seconds <= 0:
        return {
            "success": False,
            "message": "No future manoeuvre simulation time available."
        }

    result = optimize_maneuver(
        position_a=initial["position_1"],
        velocity_a=initial["velocity_1"],
        position_b=initial["position_2"],
        velocity_b=initial["velocity_2"],
        initial_mass=initial_mass,
        specific_impulse=specific_impulse,
        safety_threshold_km=safety_threshold_km,
        max_delta_v=max_delta_v,
        step_size=step_size,
        duration_seconds=duration_seconds
    )

    return {
        "success": result["success"],
        "object_1": encounter["object_1"],
        "object_2": encounter["object_2"],
        "time_to_encounter_seconds": duration_seconds,
        "optimization": result
    }


# 10. MAIN TEST


if __name__ == "__main__":

    print("\n--- TRESSPACE ENCOUNTER INTEGRATION ---")

    # Import here to avoid circular imports
    from app.services.collision_detection import detect_close_approaches

    print("\nRunning collision screening...")

    encounters = detect_close_approaches(
        time_window_hours=6,
        time_step_seconds=60,
        threshold_km=10
    )

    threats = [
        item for item in encounters
        if item["screening_status"] == "CLOSE_APPROACH"
    ]

    print("Total pairs screened:", len(encounters))
    print("Close approaches found:", len(threats))

    if threats:

        encounter = threats[0]

        print("\nSelected encounter:")
        print(encounter["object_1"], "<->", encounter["object_2"])
        print("Screening distance:", encounter["closest_approach_km"], "km")

        result = evaluate_detected_encounter(
            encounter,
            delta_v=[0, 0, 0.001],
            safety_threshold_km=5
        )

        print("\n--- AVOIDANCE RESULT ---")
        print(result)

    else:

        print("\nNo close approaches found.")
        print("Avoidance evaluation skipped.")




