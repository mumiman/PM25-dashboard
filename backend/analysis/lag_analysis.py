"""
Lag Correlation Analysis Module
Analyzes time-delayed correlations between PM2.5 exposure and disease cases.
"""

import numpy as np
from scipy import stats
from typing import List, Dict, Any
from .correlation import aggregate_weekly_pm25, aggregate_weekly_hdc


def compute_lag_analysis(pm25_data: Dict, hdc_data: Dict, provinces: List[str], year: int,
                         max_lag: int = 4) -> List[Dict]:
    """
    Compute cross-correlation at different lag values to find optimal delay.
    
    Args:
        pm25_data: PM2.5 JSON data
        hdc_data: HDC JSON data
        provinces: List of province names
        year: Target year
        max_lag: Maximum lag in weeks to test
        
    Returns:
        List of lag analysis results for each disease.
    """
    results = []
    disease_groups = hdc_data.get('metadata', {}).get('groups', ['Respiratory', 'Cardiovascular', 'Skin', 'Eye'])
    
    # Aggregate data
    weekly_pm25 = aggregate_weekly_pm25(pm25_data, provinces, year)
    weekly_hdc = aggregate_weekly_hdc(hdc_data, provinces, year, disease_groups)
    
    if not weekly_pm25 or not weekly_hdc:
        return results
    
    # Get sorted weeks
    all_weeks = sorted(weekly_pm25.keys())
    
    if len(all_weeks) < max_lag + 5:
        return results
    
    pm25_values = [weekly_pm25.get(w, 0) for w in all_weeks]
    
    for disease in ['Total'] + disease_groups:
        if disease not in weekly_hdc:
            continue
            
        case_values = [weekly_hdc[disease].get(w, 0) for w in all_weeks]
        
        lag_correlations = []
        best_lag = 0
        best_r = 0
        
        for lag in range(max_lag + 1):
            # Shift PM2.5 values by lag
            if lag == 0:
                pm25_lagged = pm25_values
                cases_aligned = case_values
            else:
                pm25_lagged = pm25_values[:-lag]
                cases_aligned = case_values[lag:]
            
            if len(pm25_lagged) < 5:
                continue
            
            # Calculate correlation
            r, p_value = stats.pearsonr(pm25_lagged, cases_aligned)
            
            lag_correlations.append({
                "lag": lag,
                "r": round(r, 4),
                "p_value": round(p_value, 6)
            })
            
            if abs(r) > abs(best_r):
                best_r = r
                best_lag = lag
        
        if lag_correlations:
            results.append({
                "disease": disease,
                "correlations": lag_correlations,
                "optimal_lag": best_lag,
                "optimal_r": round(best_r, 4)
            })
    
    return results
