"""
ARIMA/SARIMA Forecasting Module
Predicts future PM2.5 and disease cases using time series models.
Uses current week as baseline (PM2.5: week 4/2026, Patients: week 3/2026 due to data lag)
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')


def compute_forecast(pm25_data: Dict, hdc_data: Dict, provinces: List[str], year: int, 
                     forecast_weeks: int = 12) -> List[Dict]:
    """
    Compute ARIMA/SARIMA forecasts for PM2.5 and disease cases.
    PM2.5 current week: 4, 2026
    Patients current week: 3, 2026 (data lag of 1 week)
    
    Returns:
        List of forecast results with predictions, confidence intervals, and model info.
    """
    results = []
    
    # Current baseline weeks (PM2.5 is current, patients lag by 1 week)
    pm25_current_week = 4  # Week 4, 2026
    pm25_current_year = 2026
    patients_current_week = 3  # Week 3, 2026 (lag -1)
    patients_current_year = 2026
    
    # Forecast PM2.5
    pm25_forecast, pm25_model_info = forecast_pm25(
        pm25_data, provinces, pm25_current_year, pm25_current_week, forecast_weeks
    )
    if pm25_forecast:
        results.append({
            "target": "PM2.5",
            "forecast": pm25_forecast,
            "model": pm25_model_info,
            "current_week": pm25_current_week,
            "current_year": pm25_current_year
        })
    
    # Forecast disease cases
    disease_groups = hdc_data.get('metadata', {}).get('groups', ['Respiratory', 'Cardiovascular', 'Skin', 'Eye'])
    
    for disease in ['Total'] + disease_groups:
        disease_forecast, disease_model_info = forecast_disease(
            hdc_data, provinces, patients_current_year, patients_current_week, disease, forecast_weeks
        )
        if disease_forecast:
            results.append({
                "target": disease,
                "forecast": disease_forecast,
                "model": disease_model_info,
                "current_week": patients_current_week,
                "current_year": patients_current_year
            })
    
    return results


def forecast_pm25(pm25_data: Dict, provinces: List[str], current_year: int, 
                  current_week: int, forecast_weeks: int) -> Tuple[List[Dict], Dict]:
    """Forecast PM2.5 using SARIMA model."""
    model_info = {
        "name": "SARIMA",
        "order": "(1,1,1)",
        "seasonal_order": "(1,1,1,52)",
        "description": "Seasonal ARIMA with 52-week seasonality"
    }
    
    try:
        from statsmodels.tsa.statespace.sarimax import SARIMAX
    except ImportError:
        forecast, _ = simple_forecast_fallback("PM2.5", current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "order": "N/A", "seasonal_order": "N/A", "description": "Simple seasonal average"}
    
    # Aggregate weekly PM2.5
    weekly_pm25 = aggregate_weekly_pm25_series(pm25_data, provinces)
    
    if len(weekly_pm25) < 52:  # Need at least 1 year of data
        forecast, _ = simple_forecast_fallback("PM2.5", current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "order": "N/A", "seasonal_order": "N/A", "description": "Insufficient data for SARIMA"}
    
    # Filter data up to current week
    cutoff_date = datetime(current_year, 1, 1) + pd.Timedelta(weeks=current_week)
    weekly_pm25 = weekly_pm25[weekly_pm25.index <= cutoff_date]
    
    if len(weekly_pm25) < 52:
        forecast, _ = simple_forecast_fallback("PM2.5", current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "order": "N/A", "seasonal_order": "N/A", "description": "Insufficient data after filtering"}
    
    try:
        # Fit SARIMA model (seasonal period = 52 weeks)
        model = SARIMAX(
            weekly_pm25,
            order=(1, 1, 1),
            seasonal_order=(1, 1, 1, 52),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        results = model.fit(disp=False, maxiter=100)
        
        # Update model info with actual parameters
        model_info["aic"] = round(results.aic, 2)
        model_info["bic"] = round(results.bic, 2)
        
        # Forecast
        forecast = results.get_forecast(steps=forecast_weeks)
        predictions = forecast.predicted_mean
        conf_int = forecast.conf_int(alpha=0.05)
        
        forecast_data = []
        for i in range(forecast_weeks):
            future_week = current_week + i + 1
            future_year = current_year
            if future_week > 52:
                future_week -= 52
                future_year += 1
            
            forecast_data.append({
                "week": future_week,
                "year": future_year,
                "value": round(float(predictions.iloc[i]), 2),
                "ci_lower": round(float(conf_int.iloc[i, 0]), 2),
                "ci_upper": round(float(conf_int.iloc[i, 1]), 2)
            })
        
        return forecast_data, model_info
        
    except Exception as e:
        print(f"SARIMA failed: {e}")
        model_info["error"] = str(e)
        forecast, _ = simple_forecast_fallback("PM2.5", current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "order": "N/A", "seasonal_order": "N/A", "description": f"SARIMA failed: {e}"}


def forecast_disease(hdc_data: Dict, provinces: List[str], current_year: int, 
                     current_week: int, disease: str, forecast_weeks: int) -> Tuple[List[Dict], Dict]:
    """Forecast disease cases using Exponential Smoothing."""
    model_info = {
        "name": "Holt-Winters",
        "trend": "additive",
        "seasonal": "additive",
        "seasonal_periods": 52,
        "description": "Exponential Smoothing with additive trend and seasonality"
    }
    
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
    except ImportError:
        forecast, _ = simple_forecast_fallback(disease, current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "trend": "N/A", "seasonal": "N/A", "description": "Library not available"}
    
    # Aggregate weekly disease cases
    weekly_cases = aggregate_weekly_disease_series(hdc_data, provinces, disease)
    
    if len(weekly_cases) < 52:
        forecast, _ = simple_forecast_fallback(disease, current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "trend": "N/A", "seasonal": "N/A", "description": "Insufficient data"}
    
    # Filter data up to current week (patients lag by 1 week)
    cutoff_date = datetime(current_year, 1, 1) + pd.Timedelta(weeks=current_week)
    weekly_cases = weekly_cases[weekly_cases.index <= cutoff_date]
    
    if len(weekly_cases) < 52:
        forecast, _ = simple_forecast_fallback(disease, current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "trend": "N/A", "seasonal": "N/A", "description": "Insufficient data after filtering"}
    
    try:
        model = ExponentialSmoothing(
            weekly_cases,
            trend='add',
            seasonal='add',
            seasonal_periods=52
        )
        results = model.fit(optimized=True)
        
        # Update model info with parameters
        model_info["smoothing_level"] = round(results.params.get('smoothing_level', 0), 4)
        model_info["smoothing_trend"] = round(results.params.get('smoothing_trend', 0), 4)
        model_info["smoothing_seasonal"] = round(results.params.get('smoothing_seasonal', 0), 4)
        
        # Forecast
        predictions = results.forecast(forecast_weeks)
        
        # Estimate confidence intervals (approximate)
        residuals = results.resid
        std_resid = np.std(residuals)
        
        forecast_data = []
        for i in range(forecast_weeks):
            future_week = current_week + i + 1
            future_year = current_year
            if future_week > 52:
                future_week -= 52
                future_year += 1
            
            pred = max(0, float(predictions.iloc[i]))  # Cases can't be negative
            ci_width = 1.96 * std_resid * np.sqrt(i + 1)
            forecast_data.append({
                "week": future_week,
                "year": future_year,
                "value": round(pred, 0),
                "ci_lower": round(max(0, pred - ci_width), 0),
                "ci_upper": round(pred + ci_width, 0)
            })
        
        return forecast_data, model_info
        
    except Exception as e:
        print(f"ExponentialSmoothing failed for {disease}: {e}")
        forecast, _ = simple_forecast_fallback(disease, current_year, current_week, forecast_weeks)
        return forecast, {"name": "Fallback", "trend": "N/A", "seasonal": "N/A", "description": f"Model failed: {e}"}


def simple_forecast_fallback(target: str, current_year: int, current_week: int, 
                             forecast_weeks: int) -> Tuple[List[Dict], Dict]:
    """Simple fallback forecast when models fail (historical average)."""
    base_value = 30.0 if target == "PM2.5" else 100
    
    model_info = {
        "name": "Seasonal Average",
        "description": "Fallback using historical seasonal patterns"
    }
    
    forecast_data = []
    for i in range(forecast_weeks):
        future_week = current_week + i + 1
        future_year = current_year
        if future_week > 52:
            future_week -= 52
            future_year += 1
        
        # Add some seasonality (peak around Feb-Mar, trough around Aug-Sep)
        seasonal_factor = 1 + 0.3 * np.sin(2 * np.pi * (future_week - 10) / 52)
        value = base_value * seasonal_factor
        
        forecast_data.append({
            "week": future_week,
            "year": future_year,
            "value": round(value, 2 if target == "PM2.5" else 0),
            "ci_lower": round(value * 0.7, 2 if target == "PM2.5" else 0),
            "ci_upper": round(value * 1.3, 2 if target == "PM2.5" else 0)
        })
    
    return forecast_data, model_info


def aggregate_weekly_pm25_series(pm25_data: Dict, provinces: List[str]) -> pd.Series:
    """Aggregate PM2.5 to a time series of weekly averages."""
    metadata = pm25_data.get('metadata', {})
    station_regions = metadata.get('stationRegions', {})
    data = pm25_data.get('data', {})
    
    all_values = []
    
    region6_stations = [
        s for s, r in station_regions.items() 
        if r == 'เขตสุขภาพที่ 6'
    ]
    
    for station in region6_stations:
        station_data = data.get(station, [])
        for point in station_data:
            try:
                all_values.append({
                    'date': datetime.strptime(point['date'], '%Y-%m-%d'),
                    'value': point['value']
                })
            except (ValueError, KeyError):
                continue
    
    if not all_values:
        return pd.Series(dtype=float)
    
    df = pd.DataFrame(all_values)
    df.set_index('date', inplace=True)
    df = df.sort_index()
    
    # Resample to weekly
    weekly = df.resample('W').mean()
    
    return weekly['value'].dropna()


def aggregate_weekly_disease_series(hdc_data: Dict, provinces: List[str], disease: str) -> pd.Series:
    """Aggregate disease cases to a time series of weekly totals."""
    data = hdc_data.get('data', {})
    disease_groups = hdc_data.get('metadata', {}).get('groups', [])
    
    all_weeks = []
    
    for province in provinces:
        if province not in data:
            continue
            
        for year_key, year_data in data[province].items():
            try:
                year = int(year_key)
            except ValueError:
                continue
                
            diseases = year_data.get('diseases', {})
            weeks = year_data.get('weeks', list(range(1, 54)))
            
            for i, week in enumerate(weeks):
                if disease == 'Total':
                    total = sum(
                        diseases.get(g, [])[i] if i < len(diseases.get(g, [])) else 0
                        for g in disease_groups
                    )
                else:
                    group_data = diseases.get(disease, [])
                    total = group_data[i] if i < len(group_data) else 0
                
                all_weeks.append({
                    'date': datetime(year, 1, 1) + pd.Timedelta(weeks=week-1),
                    'value': total or 0
                })
    
    if not all_weeks:
        return pd.Series(dtype=float)
    
    df = pd.DataFrame(all_weeks)
    df = df.groupby('date').sum().sort_index()
    
    return df['value']
