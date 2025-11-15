from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List
import finetune_logic

app = FastAPI(title="Robot Fine-Tuning API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        allow_origins=["*"],
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Point(BaseModel):
    x: float = Field(..., description="X coordinate in meters")
    y: float = Field(..., description="Y coordinate in meters")
    angle: float = Field(..., description="Angle in degrees")
    
    @field_validator('x', 'y', 'angle')
    @classmethod
    def check_numeric(cls, v):
        if not isinstance(v, (int, float)):
            raise ValueError("Must be a number")
        return float(v)

class FineTuneRequest(BaseModel):
    points: List[Point] = Field(..., min_length=1, max_length=10)
    segments: List[float] = Field(default_factory=list)
    
    @field_validator('segments')
    @classmethod
    def check_segments(cls, v):
        return [float(s) if isinstance(s, (int, float)) else 0.0 for s in v]

@app.get("/")
def read_root():
    return {"status": "Robot Fine-Tuning API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "fine-tune-api"}

@app.post("/fine_tune/run")
def fine_tune_run(request: FineTuneRequest):
    try:
        points_data = [p.model_dump() for p in request.points]
        segments_data = request.segments
        result = finetune_logic.compute_fine_tuning(points_data, segments_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
