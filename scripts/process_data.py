import pandas as pd
import glob
import os
import json
import numpy as np
import sys

# Add script directory to path for imports
sys.path.append(os.path.dirname(__file__))

try:
    import process_pompam_csv
    from region_mapping import get_region
except ImportError as e:
    print(f"Error importing modules: {e}")
    sys.exit(1)

# Configuration
DATA_DIR = "data/PM25"
OUTPUT_DIR = "public/data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "pm25_consolidated.json")

def process_data():
    print("--- Starting Data Processing ---")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # ---------------------------------------------------------
    # 1. PROCESS EXCEL FILES
    # ---------------------------------------------------------
    files = sorted(glob.glob(os.path.join(DATA_DIR, "*.xlsx")))
    all_excel_data = [] # List of DataFrames
    
    print(f"Found {len(files)} Excel files.")
    
    for f in files:
        filename = os.path.basename(f)
        try:
            print(f"Reading {filename}...")
            df = pd.read_excel(f)
            
            # Standardize 'Date' column
            if 'Date' not in df.columns:
                 potential_date_cols = [c for c in df.columns if 'date' in str(c).lower()]
                 if potential_date_cols:
                     df.rename(columns={potential_date_cols[0]: 'Date'}, inplace=True)
                 else:
                     print(f"Warning: No 'Date' column found in {filename}, skipping.")
                     continue
            
            df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
            df = df.dropna(subset=['Date'])
            
            # Clean station column names
            # Get station columns (all except Date)
            station_cols = [c for c in df.columns if c != 'Date']
            clean_station_cols = {c: str(c).strip() for c in station_cols}
            df = df.rename(columns=clean_station_cols)
            station_cols = list(clean_station_cols.values())
            
            # Melt to long format: Date, StationID, Value
            melted = df.melt(id_vars=['Date'], value_vars=station_cols, var_name='StationID', value_name='PM25')
            
            # Clean numeric values
            melted['PM25'] = pd.to_numeric(melted['PM25'], errors='coerce')
            melted = melted.dropna(subset=['PM25'])
            
            all_excel_data.append(melted)
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    # ---------------------------------------------------------
    # 2. PROCESS CSV DATA
    # ---------------------------------------------------------
    print("\nProcessing CSV data...")
    try:
        csv_result = process_pompam_csv.process_pompam_csv()
        csv_data = csv_result['data']
        csv_metadata = csv_result['metadata']
        print("CSV processing successful.")
    except Exception as e:
        print(f"Error processing CSV: {e}")
        csv_data = {}
        csv_metadata = {'stationInfo': {}, 'stations': []}

    # ---------------------------------------------------------
    # 3. MERGE DATA
    # ---------------------------------------------------------
    print("\nMerging data sources...")
    
    # Master dictionary: data_map[station][date_str] = value
    data_map = {}
    
    # helper to add data
    def add_point(station, date_str, value):
        if station not in data_map:
            data_map[station] = {}
        data_map[station][date_str] = value

    # A. Add Excel Data
    if all_excel_data:
        full_excel_df = pd.concat(all_excel_data, ignore_index=True)
        # Convert to dictionary for easier merging
        for _, row in full_excel_df.iterrows():
            st = str(row['StationID']).strip()
            dt = row['Date'].strftime('%Y-%m-%d')
            val = float(row['PM25'])
            add_point(st, dt, val)
        print(f"Imported Excel data. Total known stations: {len(data_map)}")
    
    # B. Add CSV Data (Overwrite/Upsert)
    # csv_data structure: { StationID: [ { 'date': 'YYYY-MM-DD', 'value': 12.3 }, ... ] }
    csv_count = 0
    for st, records in csv_data.items():
        st = str(st).strip()
        for rec in records:
            add_point(st, rec['date'], rec['value'])
            csv_count += 1
            
    print(f"Integrated CSV records. Total stations now: {len(data_map)}")

    # ---------------------------------------------------------
    # 4. CONSOLIDATE METADATA
    # ---------------------------------------------------------
    print("\nConsolidating metadata...")
    
    station_names = {}
    station_provinces = {}
    
    # A. Extract from Excel Metadata (Primary source for comprehensive info)
    # We look for the 2025 file or iterate files to find one with metadata
    meta_files = glob.glob(os.path.join(DATA_DIR, "*2025*.xlsx"))
    meta_file = meta_files[0] if meta_files else None
    
    if meta_file:
        try:
            print(f"Reading metadata from {os.path.basename(meta_file)}...")
            # Using logic from previous script version
            meta_raw = pd.read_excel(meta_file, sheet_name="รายละเอียดจุดตรวจวัด", header=None)
            
            header_row_idx = None
            for i, row in meta_raw.iterrows():
                if list(row).count("รหัสสถานี") > 0:
                    header_row_idx = i
                    break
            
            if header_row_idx is not None:
                meta_raw.columns = meta_raw.iloc[header_row_idx]
                meta_clean = meta_raw.iloc[header_row_idx+1:].copy()
                
                has_details = "รายละเอียดจุดติดตั้งสถานี" in meta_clean.columns
                
                for _, row in meta_clean.iterrows():
                    code = str(row["รหัสสถานี"]).strip()
                    if not code or code.lower() == 'nan': continue
                    
                    address = str(row["ชื่อสถานี"]).strip()
                    detail_name = str(row["รายละเอียดจุดติดตั้งสถานี"]).strip() if has_details else ""
                    
                    # Store Display Name
                    display_name = detail_name if detail_name and detail_name.lower() != 'nan' else address
                    station_names[code] = display_name
                    
                    # Extract Province
                    province = "Unknown Province"
                    if "กทม" in address or "กรุงเทพ" in address:
                        province = "Bangkok"
                    elif "จ." in address:
                        try:
                            parts = address.split("จ.")
                            if len(parts) > 1:
                                province = parts[1].strip().split(" ")[0]
                        except:
                            pass
                    
                    station_provinces[code] = province
        except Exception as e:
            print(f"Warning: Excel metadata extraction failed: {e}")

    # B. Merge/Update with CSV Metadata
    # csv_metadata['stationInfo'] = { code: { province, district, display_name } }
    for st, info in csv_metadata.get('stationInfo', {}).items():
        st = str(st).strip()
        
        # If not present in station_names (Excel), add it
        if st not in station_names:
            station_names[st] = info.get('display_name', st)
        
        # If not present in provinces (Excel) OR previous was Unknown, update it
        # (Assuming CSV province data is reliable)
        if st not in station_provinces or station_provinces[st] == "Unknown Province":
            station_provinces[st] = info.get('province', 'Unknown Province')

    # ---------------------------------------------------------
    # 5. GENERATE REGIONS
    # ---------------------------------------------------------
    station_regions = {}
    for st, prov in station_provinces.items():
        station_regions[st] = get_region(prov)

    # Make sure all stations in data_map have metadata
    for st in data_map.keys():
        if st not in station_names:
            station_names[st] = st # fallback
        if st not in station_provinces:
            station_provinces[st] = "Unknown Province"
            station_regions[st] = "Unknown Health Region"

    # ---------------------------------------------------------
    # 6. FINALIZE OUTPUT
    # ---------------------------------------------------------
    
    # Calculate global date range
    all_dates = []
    for st_data in data_map.values():
        all_dates.extend(st_data.keys())
        
    min_date = min(all_dates) if all_dates else None
    max_date = max(all_dates) if all_dates else None
    
    # Format data for output: { StationID: [ { date: YYYY-MM-DD, value: 12.3 }, ... ] }
    final_data_structure = {}
    sorted_stations = sorted(data_map.keys())
    
    for st in sorted_stations:
        points = []
        for dt in sorted(data_map[st].keys()):
            points.append({
                "date": dt,
                "value": data_map[st][dt]
            })
        final_data_structure[st] = points

    output_payload = {
        "metadata": {
            "minDate": min_date,
            "maxDate": max_date,
            "stations": sorted_stations,
            "stationNames": station_names,
            "stationProvinces": station_provinces,
            "stationRegions": station_regions
        },
        "data": final_data_structure
    }
    
    print(f"Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, separators=(',', ':'), ensure_ascii=False)
        
    print(f"Success! Processed {len(sorted_stations)} stations from {min_date} to {max_date}.")

if __name__ == "__main__":
    process_data()

