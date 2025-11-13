import math
from typing import List, Dict, Any
import numpy as np

def normalize_angle(angle_deg: float) -> float:
    angle = angle_deg % 360
    if angle >= 180:
        angle -= 360
    return angle

def mean_angle(angles_deg: List[float]) -> float:
    if not angles_deg:
        return 0.0
    angles_rad = [math.radians(a) for a in angles_deg]
    x_sum = sum(math.cos(a) for a in angles_rad)
    y_sum = sum(math.sin(a) for a in angles_rad)
    mean_rad = math.atan2(y_sum, x_sum)
    return normalize_angle(math.degrees(mean_rad))

def std_angle(angles_deg: List[float], mean_deg: float) -> float:
    if len(angles_deg) < 2:
        return 0.0
    differences = []
    for a in angles_deg:
        diff = normalize_angle(a - mean_deg)
        differences.append(diff)
    variance = sum(d**2 for d in differences) / (len(differences) - 1)
    return math.sqrt(variance)

def compute_fine_tuning(points: List[Dict[str, float]], segments: List[float]) -> Dict[str, Any]:
    if len(points) < 1:
        raise ValueError("Need at least 1 point")
    needed_segments = len(points) - 1
    if len(segments) < needed_segments:
        segments = list(segments) + [0.0] * (needed_segments - len(segments))
    segments = segments[:needed_segments]
    x_vals = [p['x'] for p in points]
    y_vals = [p['y'] for p in points]
    angle_vals = [p['angle'] for p in points]
    mean_x = float(np.mean(x_vals))
    mean_y = float(np.mean(y_vals))
    mean_angle_deg = mean_angle(angle_vals)
    if len(x_vals) > 1:
        std_x_m = float(np.std(x_vals, ddof=1))
        std_y_m = float(np.std(y_vals, ddof=1))
    else:
        std_x_m = 0.0
        std_y_m = 0.0
    std_angle_deg = std_angle(angle_vals, mean_angle_deg)
    std_x_mm = std_x_m * 1000
    std_y_mm = std_y_m * 1000
    mean_angle_rad = math.radians(mean_angle_deg)
    cos_a = math.cos(mean_angle_rad)
    sin_a = math.sin(mean_angle_rad)
    sequence = []
    current_x = mean_x
    current_y = mean_y
    sequence.append({'x': round(current_x, 6), 'y': round(current_y, 6), 'angle': round(mean_angle_deg, 4)})
    for seg_length in segments:
        current_x += seg_length * cos_a
        current_y += seg_length * sin_a
        sequence.append({'x': round(current_x, 6), 'y': round(current_y, 6), 'angle': round(mean_angle_deg, 4)})
    return {
        'fine_tuned': {
            'mean_x': round(mean_x, 6),
            'mean_y': round(mean_y, 6),
            'mean_angle': round(mean_angle_deg, 4),
            'std_x_mm': round(std_x_mm, 4),
            'std_y_mm': round(std_y_mm, 4),
            'std_angle_deg': round(std_angle_deg, 4)
        },
        'sequence': sequence
    }
