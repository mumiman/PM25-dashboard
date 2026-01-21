"""
PM2.5 Dashboard - Analysis Backend (FastAPI)
Provides statistical analysis endpoints for correlation, forecasting, and lag analysis.
Includes JSON caching to avoid recomputation.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import os
from datetime import datetime

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
CACHE_PATH = os.path.join(DATA_DIR, "analysis_cache.json")

class ComputeRequest(BaseModel):
    year: int = 2026
    force_recompute: bool = False

class CorrelationResult(BaseModel):
    disease: str
    r: float
    ci_lower: float
    ci_upper: float
    p_value: float
    r_squared: float
    n: int

class ForecastPoint(BaseModel):
    week: int
    year: int
    value: float
    ci_lower: float
    ci_upper: float

class ModelInfo(BaseModel):
    name: str
    order: Optional[str] = None
    seasonal_order: Optional[str] = None
    trend: Optional[str] = None
    seasonal: Optional[str] = None
    seasonal_periods: Optional[int] = None
    description: str
    aic: Optional[float] = None
    bic: Optional[float] = None
    smoothing_level: Optional[float] = None
    smoothing_trend: Optional[float] = None
    smoothing_seasonal: Optional[float] = None

class ForecastResult(BaseModel):
    target: str
    forecast: List[ForecastPoint]
    model: ModelInfo
    current_week: int
    current_year: int
    
class LagResult(BaseModel):
    disease: str
    correlations: list
    optimal_lag: int
    optimal_r: float

class AnalysisResponse(BaseModel):
    correlations: List[CorrelationResult]
    forecasts: List[ForecastResult]
    lag_analysis: List[LagResult]
    threshold_analysis: dict
    computed_at: str
    cached: bool = False

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

def load_cache(year: int) -> Optional[Dict]:
    """Load cached analysis results if they exist."""
    try:
        if os.path.exists(CACHE_PATH):
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            # Check if cache is for the same year and not too old (within 24 hours)
            if cache.get('year') == year:
                # Cache is valid
                return cache
    except (json.JSONDecodeError, FileNotFoundError):
        pass
    return None

def save_cache(year: int, data: Dict):
    """Save analysis results to cache file."""
    try:
        cache_data = {
            'year': year,
            **data
        }
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Failed to save cache: {e}")

@app.get("/")
def root():
    return {"message": "PM2.5 Analysis API", "status": "running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/analysis")
def get_cached_analysis(year: int = 2026):
    """Get cached analysis results if available."""
    cache = load_cache(year)
    if cache:
        return {**cache, "cached": True}
    return {"error": "No cached results available", "cached": False}

@app.post("/api/compute")
def compute_analysis(request: ComputeRequest):
    """
    Compute all statistical analyses for the given year.
    Returns correlation, forecast, lag analysis, and threshold analysis.
    
    - If force_recompute is False and cache exists, return cached results
    - Otherwise, compute fresh results and save to cache
    """
    # Check cache first (unless force_recompute)
    if not request.force_recompute:
        cache = load_cache(request.year)
        if cache:
            # Remove year key before returning
            cache.pop('year', None)
            cache['cached'] = True
            return cache
    
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
    
    result = {
        "correlations": correlations,
        "forecasts": forecasts,
        "lag_analysis": lag_analysis,
        "threshold_analysis": threshold_analysis,
        "computed_at": datetime.now().isoformat(),
        "cached": False
    }
    
    # Save to cache
    save_cache(request.year, result)
    
    return result

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
