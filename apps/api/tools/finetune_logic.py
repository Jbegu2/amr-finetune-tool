# tools/finetune_logic.py
# Input: list of points (2D or 3D), unit flag
# Output: mean point in meters, std dev per-axis in mm, and radial std dev in mm.

from typing import List, Dict, Tuple
import math

def _to_meters(val: float, in_unit: str) -> float:
    if in_unit == "mm":
        return val / 1000.0
    if in_unit == "m":
        return val
    raise ValueError("in_unit must be 'mm' or 'm'")

def _to_mm(val: float, in_unit: str) -> float:
    if in_unit == "mm":
        return val
    if in_unit == "m":
        return val * 1000.0
    raise ValueError("in_unit must be 'mm' or 'm'")

def process_points(
    points: List[Dict[str, float]],
    in_unit: str = "m",
) -> Dict[str, Dict[str, float]]:
    """
    points: list of dicts with keys x,y[,z].
    in_unit: 'm' or 'mm' for input coordinates.
    Returns:
      {
        "count": N,
        "mean_point_m": {"x": mx, "y": my, "z": mz or 0.0},
        "std_per_axis_mm": {"x": sx_mm, "y": sy_mm, "z": sz_mm or 0.0},
        "radial_std_mm": s_rad_mm
      }
    """
    if not points or len(points) < 2:
        raise ValueError("At least 2 points required")

    has_z = "z" in points[0]
    xs_m = [_to_meters(p["x"], in_unit) for p in points]
    ys_m = [_to_meters(p["y"], in_unit) for p in points]
    zs_m = [_to_meters(p["z"], in_unit) for p in points] if has_z else [0.0] * len(points)

    n = float(len(points))
    mx, my, mz = sum(xs_m)/n, sum(ys_m)/n, sum(zs_m)/n

    # std per axis (sample std, ddof=1) computed in meters then converted to mm
    def _sample_std(vals_m: List[float]) -> float:
        if len(vals_m) < 2: return 0.0
        mean = sum(vals_m)/len(vals_m)
        var = sum((v - mean)**2 for v in vals_m) / (len(vals_m) - 1)
        return math.sqrt(var)

    sx_mm = _to_mm(_sample_std(xs_m), "m")
    sy_mm = _to_mm(_sample_std(ys_m), "m")
    sz_mm = _to_mm(_sample_std(zs_m), "m") if has_z else 0.0

    # radial std dev (distance from mean), sample std, in mm
    dists_m = [math.sqrt((x - mx)**2 + (y - my)**2 + (z - mz)**2)
               for x, y, z in zip(xs_m, ys_m, zs_m)]
    s_rad_mm = _to_mm(_sample_std(dists_m), "m")

    return {
        "count": int(n),
        "mean_point_m": {"x": mx, "y": my, "z": mz if has_z else 0.0},
        "std_per_axis_mm": {"x": sx_mm, "y": sy_mm, "z": sz_mm},
        "radial_std_mm": s_rad_mm,
    }
