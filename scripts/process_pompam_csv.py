"""
Process pompam_PM2.5.csv data file
Converts wide-format CSV with Thai headers to structured data for integration
"""

import pandas as pd
import os
import json
import re
import numpy as np

# Configuration
CSV_FILE = "data/pompam_PM2.5.csv"
OUTPUT_DIR = "public/data"
INTERMEDIATE_FILE = os.path.join(OUTPUT_DIR, "pompam_pm25_processed.json")

# Station metadata extracted from CSV header rows
# Row 1: Province names (จังหวัด)
# Row 2: District/Location (อำเภอ) 
# Row 3: Station codes (วันที่, ช่วงเวลา, then station codes)

def clean_numeric_value(val):
    """Clean and parse numeric values, handling Thai CSV quirks"""
    if pd.isna(val) or val == 'NA' or val == '' or val == 'nan':
        return None
    
    # Convert to string and clean
    s = str(val).strip()
    
    # Handle typos like "23..7" -> "23.7"
    s = re.sub(r'\.\.+', '.', s)
    
    # Handle any non-numeric characters except decimal point and minus
    s = re.sub(r'[^\d.\-]', '', s)
    
    if not s or s == '.' or s == '-':
        return None
    
    try:
        return float(s)
    except ValueError:
        return None

def parse_date(date_str):
    """Parse Thai date format (d/m/yyyy) to ISO format"""
    if pd.isna(date_str):
        return None
    
    s = str(date_str).strip()
    
    # Try different formats
    for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
        try:
            dt = pd.to_datetime(s, format=fmt)
            return dt.strftime('%Y-%m-%d')
        except:
            continue
    
    # Fallback: let pandas try
    try:
        dt = pd.to_datetime(s, dayfirst=True)
        return dt.strftime('%Y-%m-%d')
    except:
        return None

def process_pompam_csv():
    """Main processing function"""
    print(f"--- Processing {CSV_FILE} ---")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Read raw CSV to understand structure
    # First 3 rows are headers: Province, District, Date/Time + Station Codes
    df_raw = pd.read_csv(CSV_FILE, header=None, encoding='utf-8')
    
    print(f"Raw shape: {df_raw.shape}")
    
    # Extract header information (first 3 rows)
    provinces_row = df_raw.iloc[0].tolist()
    districts_row = df_raw.iloc[1].tolist()
    station_row = df_raw.iloc[2].tolist()
    
    # Data starts from row 3 (index 3)
    # Columns: 0=Date, 1=Time, 2+=Station values
    
    # Build station metadata
    station_metadata = {}
    station_columns = {}  # Map column index to station code
    
    for col_idx in range(2, len(station_row)):
        station_code = str(station_row[col_idx]).strip()
        
        if not station_code or station_code == 'nan' or station_code == '':
            continue
            
        province = str(provinces_row[col_idx]).strip() if col_idx < len(provinces_row) else ''
        district = str(districts_row[col_idx]).strip() if col_idx < len(districts_row) else ''
        
        # Clean province - extract just province name
        province_clean = province.replace('จ.', '').replace('จังหวัด', '').strip()
        
        # Handle special cases
        if province_clean == 'ตราด':
            province_clean = 'ตราด'
        
        station_metadata[station_code] = {
            'province': province_clean,
            'district': district,
            'display_name': f"{district}" if district else station_code
        }
        station_columns[col_idx] = station_code
    
    print(f"Found {len(station_metadata)} stations")
    
    # Process data rows
    data_records = []
    
    for row_idx in range(3, len(df_raw)):
        row = df_raw.iloc[row_idx]
        
        # Parse date
        date_str = parse_date(row[0])
        if not date_str:
            continue
        
        # Process each station column
        for col_idx, station_code in station_columns.items():
            if col_idx >= len(row):
                continue
                
            value = clean_numeric_value(row[col_idx])
            
            if value is not None and value >= 0:  # Valid positive PM2.5 value
                data_records.append({
                    'date': date_str,
                    'station': station_code,
                    'value': round(value, 1)
                })
    
    print(f"Processed {len(data_records)} data records")
    
    # Create output structure
    # Group by station for compact storage
    stations_data = {}
    for record in data_records:
        station = record['station']
        if station not in stations_data:
            stations_data[station] = []
        stations_data[station].append({
            'date': record['date'],
            'value': record['value']
        })
    
    # Sort data within each station
    for station in stations_data:
        stations_data[station].sort(key=lambda x: x['date'])
    
    # Calculate date range
    all_dates = [r['date'] for r in data_records]
    min_date = min(all_dates) if all_dates else None
    max_date = max(all_dates) if all_dates else None
    
    output = {
        'metadata': {
            'source': 'pompam_PM2.5.csv',
            'minDate': min_date,
            'maxDate': max_date,
            'stations': sorted(station_metadata.keys()),
            'stationInfo': station_metadata
        },
        'data': stations_data
    }
    
    # Save intermediate file
    print(f"Saving to {INTERMEDIATE_FILE}...")
    with open(INTERMEDIATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"Done! Date range: {min_date} to {max_date}")
    print(f"Stations: {', '.join(sorted(station_metadata.keys()))}")
    
    return output

if __name__ == "__main__":
    process_pompam_csv()
