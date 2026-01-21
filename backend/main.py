"""
PM2.5 Dashboard - Analysis Backend (FastAPI)
Provides statistical analysis endpoints for correlation, forecasting, and lag analysis.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os

# Import analysis modules
from analysis.correlation import compute_correlation
from analysis.forecast import compute_forecast
from analysis.lag_analysis import compute_lag_analysis

app = FastAPI(
    title="PM2.5 Analysis API",
    description="Statistical analysis for PM2.5 and health data",
    version="1.0.0"
)

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
PM25_PATH = os.path.join(DATA_DIR, "pm25_consolidated.json")
HDC_PATH = os.path.join(DATA_DIR, "hdc_consolidated.json")

class ComputeRequest(BaseModel):
    year: int = 2025

class CorrelationResult(BaseModel):
    disease: str
    r: float
    ci_lower: float
    ci_upper: float
    p_value: float
    r_squared: float
    n: int

class ForecastResult(BaseModel):
    target: str  # "pm25" or disease name
    forecast: list  # [{"week": 1, "value": 30.5, "ci_lower": 25, "ci_upper": 36}, ...]
    
class LagResult(BaseModel):
    disease: str
    correlations: list  # [{"lag": 0, "r": 0.65}, {"lag": 1, "r": 0.72}, ...]
    optimal_lag: int
    optimal_r: float

class AnalysisResponse(BaseModel):
    correlations: list[CorrelationResult]
    forecasts: list[ForecastResult]
    lag_analysis: list[LagResult]
    threshold_analysis: dict
    computed_at: str

def load_data():
    """Load PM2.5 and HDC data from JSON files."""
    try:
        with open(PM25_PATH, 'r', encoding='utf-8') as f:
            pm25_data = json.load(f)
        with open(HDC_PATH, 'r', encoding='utf-8') as f:
            hdc_data = json.load(f)
        return pm25_data, hdc_data
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Data file not found: {e}")

@app.get("/")
def root():
    return {"message": "PM2.5 Analysis API", "status": "running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/compute", response_model=AnalysisResponse)
def compute_analysis(request: ComputeRequest):
    """
    Compute all statistical analyses for the given year.
    Returns correlation, forecast, lag analysis, and threshold analysis.
    """
    from datetime import datetime
    
    pm25_data, hdc_data = load_data()
    
    # Region 6 provinces
    region6_provinces = [
        'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ตราด',
        'ปราจีนบุรี', 'ระยอง', 'สมุทรปราการ', 'สระแก้ว'
    ]
    
    # Compute analyses
    correlations = compute_correlation(pm25_data, hdc_data, region6_provinces, request.year)
    forecasts = compute_forecast(pm25_data, hdc_data, region6_provinces, request.year)
    lag_analysis = compute_lag_analysis(pm25_data, hdc_data, region6_provinces, request.year)
    
    # Threshold analysis
    threshold_analysis = compute_threshold_analysis(pm25_data, hdc_data, region6_provinces, request.year)
    
    return AnalysisResponse(
        correlations=correlations,
        forecasts=forecasts,
        lag_analysis=lag_analysis,
        threshold_analysis=threshold_analysis,
        computed_at=datetime.now().isoformat()
    )

def compute_threshold_analysis(pm25_data, hdc_data, provinces, year):
    """Compute average cases by PM2.5 threshold levels."""
    # PM2.5 AQI categories (Thai standard)
    thresholds = {
        "Good (0-25)": (0, 25),
        "Moderate (26-37)": (26, 37),
        "Unhealthy Sensitive (38-50)": (38, 50),
        "Unhealthy (51-90)": (51, 90),
        "Very Unhealthy (>90)": (91, 999)
    }
    
    # Placeholder - will be computed in analysis module
    return {
        "thresholds": list(thresholds.keys()),
        "avg_cases": {
            "Total": [100, 150, 200, 350, 500],
            "Respiratory": [40, 60, 90, 150, 220],
            "Cardiovascular": [25, 35, 45, 80, 120],
            "Skin": [20, 30, 40, 70, 100],
            "Eye": [15, 25, 25, 50, 60]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
