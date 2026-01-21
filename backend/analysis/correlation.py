"""
Correlation Analysis Module
Computes Pearson correlation between PM2.5 and disease cases with 95% CI and p-value.
"""

import numpy as np
from scipy import stats
from datetime import datetime
from typing import List, Dict, Any


def compute_correlation(pm25_data: Dict, hdc_data: Dict, provinces: List[str], year: int) -> List[Dict]:
    """
    Compute Pearson correlation between weekly average PM2.5 and disease cases.
    
    Returns:
        List of correlation results with r, 95% CI, p-value, R² for each disease.
    """
    results = []
    disease_groups = hdc_data.get('metadata', {}).get('groups', ['Respiratory', 'Cardiovascular', 'Skin', 'Eye'])
    
    # Aggregate PM2.5 for Region 6
    weekly_pm25 = aggregate_weekly_pm25(pm25_data, provinces, year)
    
    # Aggregate HDC for Region 6
    weekly_hdc = aggregate_weekly_hdc(hdc_data, provinces, year, disease_groups)
    
    if not weekly_pm25 or not weekly_hdc:
        return results
    
    # Get common weeks
    common_weeks = sorted(set(weekly_pm25.keys()) & set(weekly_hdc['Total'].keys()))
    
    if len(common_weeks) < 5:
        return results
    
    pm25_values = [weekly_pm25[w] for w in common_weeks]
    
    # Compute correlation for Total and each disease group
    all_diseases = ['Total'] + disease_groups
    
    for disease in all_diseases:
        if disease not in weekly_hdc:
            continue
            
        case_values = [weekly_hdc[disease].get(w, 0) for w in common_weeks]
        
        # Remove any NaN or None values
        valid_pairs = [(p, c) for p, c in zip(pm25_values, case_values) if p is not None and c is not None]
        
        if len(valid_pairs) < 5:
            continue
            
        pm25_arr = np.array([p[0] for p in valid_pairs])
        cases_arr = np.array([p[1] for p in valid_pairs])
        
        # Pearson correlation
        r, p_value = stats.pearsonr(pm25_arr, cases_arr)
        
        # 95% Confidence Interval using Fisher transformation
        n = len(valid_pairs)
        ci_lower, ci_upper = pearson_confidence_interval(r, n, alpha=0.05)
        
        results.append({
            "disease": disease,
            "r": round(r, 4),
            "ci_lower": round(ci_lower, 4),
            "ci_upper": round(ci_upper, 4),
            "p_value": round(p_value, 6),
            "r_squared": round(r ** 2, 4),
            "n": n
        })
    
    return results


def pearson_confidence_interval(r: float, n: int, alpha: float = 0.05) -> tuple:
    """
    Calculate confidence interval for Pearson correlation using Fisher z-transformation.
    """
    if n < 4:
        return (-1.0, 1.0)
    
    # Fisher z-transformation
    z = np.arctanh(r)
    se = 1.0 / np.sqrt(n - 3)
    
    # Critical value for desired confidence level
    z_critical = stats.norm.ppf(1 - alpha / 2)
    
    # Confidence interval in z-space
    z_lower = z - z_critical * se
    z_upper = z + z_critical * se
    
    # Transform back to r-space
    r_lower = np.tanh(z_lower)
    r_upper = np.tanh(z_upper)
    
    return (r_lower, r_upper)


def aggregate_weekly_pm25(pm25_data: Dict, provinces: List[str], year: int) -> Dict[int, float]:
    """Aggregate PM2.5 data to weekly averages for Region 6."""
    from datetime import datetime
    
    weekly_values: Dict[int, List[float]] = {}
    
    metadata = pm25_data.get('metadata', {})
    station_provinces = metadata.get('stationProvinces', {})
    station_regions = metadata.get('stationRegions', {})
    data = pm25_data.get('data', {})
    
    # Get stations in Region 6
    region6_stations = [
        s for s, r in station_regions.items() 
        if r == 'เขตสุขภาพที่ 6'
    ]
    
    for station in region6_stations:
        station_data = data.get(station, [])
        for point in station_data:
            try:
                date = datetime.strptime(point['date'], '%Y-%m-%d')
                if date.year == year:
                    week = date.isocalendar()[1]
                    if week not in weekly_values:
                        weekly_values[week] = []
                    weekly_values[week].append(point['value'])
            except (ValueError, KeyError):
                continue
    
    # Calculate weekly averages
    return {
        week: np.mean(values) 
        for week, values in weekly_values.items() 
        if values
    }


def aggregate_weekly_hdc(hdc_data: Dict, provinces: List[str], year: int, disease_groups: List[str]) -> Dict[str, Dict[int, int]]:
    """Aggregate HDC data by week for Region 6."""
    result: Dict[str, Dict[int, int]] = {
        'Total': {},
        **{g: {} for g in disease_groups}
    }
    
    data = hdc_data.get('data', {})
    
    for province in provinces:
        if province not in data:
            continue
            
        year_data = data[province].get(str(year)) or data[province].get(year)
        if not year_data:
            continue
            
        diseases = year_data.get('diseases', {})
        weeks = year_data.get('weeks', list(range(1, 54)))
        
        for i, week in enumerate(weeks):
            if week not in result['Total']:
                result['Total'][week] = 0
                for g in disease_groups:
                    result[g][week] = 0
            
            for group in disease_groups:
                group_data = diseases.get(group, [])
                if i < len(group_data):
                    count = group_data[i] or 0
                    result[group][week] += count
                    result['Total'][week] += count
    
    return result
