
import json
import os
import sys

OUTPUT_FILE = "public/data/pm25_consolidated.json"

def verify_data():
    print("--- Starting Data Verification ---")
    
    if not os.path.exists(OUTPUT_FILE):
        print(f"Error: {OUTPUT_FILE} not found. Run process_data.py first.")
        sys.exit(1)
        
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    metadata = data.get('metadata', {})
    stations = metadata.get('stations', [])
    station_provinces = metadata.get('stationProvinces', {})
    station_regions = metadata.get('stationRegions', {})
    
    print(f"Total Stations: {len(stations)}")
    print(f"Date Range: {metadata.get('minDate')} to {metadata.get('maxDate')}")
    
    # 1. Check for CSV stations
    expected_new_stations = ['100t', '60t', '87t', '32t']
    found_new = []
    missing_new = []
    
    for st in expected_new_stations:
        if st in stations:
            found_new.append(st)
        else:
            missing_new.append(st)
            
    print(f"\nExpected New Stations Found: {len(found_new)}/{len(expected_new_stations)}")
    if missing_new:
        print(f"WARNING: Missing expected stations: {missing_new}")
    else:
        print("Success: All sample new stations found.")
        
    # 2. Check Date Range
    max_date = metadata.get('maxDate')
    if max_date and max_date >= '2026-01-01':
        print(f"\nSuccess: Date range extends to 2026 ({max_date})")
    else:
        print(f"\nWARNING: Date range does not extend to 2026. Max date is {max_date}")
        
    # 3. Check Region 6 Mapping
    # Check if '100t' (Chanthaburi) is in Region 6
    st_check = '100t'
    if st_check in station_regions:
        region = station_regions[st_check]
        print(f"\nStation {st_check} Region: {region}")
        if "6" in region:
             print(f"Success: {st_check} correctly mapped to Health Region 6")
        else:
             print(f"WARNING: {st_check} NOT mapped to Region 6!")
    else:
        print(f"WARNING: {st_check} has no region mapping!")
        
    # 4. Check Data Content
    # Pick a date late in 2025
    check_date = '2025-12-01'
    data_points = 0
    st_with_data = 0
    
    for st, records in data.get('data', {}).items():
        # records is list of {date, value}
        if records:
            data_points += len(records)
            # check for recent data
            has_recent = any(r['date'] >= '2025-01-01' for r in records)
            if has_recent:
                st_with_data += 1
                
    print(f"\nTotal Data Points: {data_points}")
    print(f"Stations with data in 2025+: {st_with_data}")
    
    if st_with_data > 0:
        print("Success: Found stations with recent data.")
    else:
        print("WARNING: No stations have data in 2025+!")

if __name__ == "__main__":
    verify_data()
