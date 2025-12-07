import pandas as pd
import glob
import os
import json
import numpy as np

# Configuration
DATA_DIR = "data/PM25"
OUTPUT_DIR = "public/data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "pm25_consolidated.json")

def process_data():
    print("--- Starting Data Processing ---")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    files = sorted(glob.glob(os.path.join(DATA_DIR, "*.xlsx")))
    
    all_data = []
    
    for f in files:
        filename = os.path.basename(f)
        try:
            print(f"Reading {filename}...")
            # Read excel, treating non-numeric values as NaN automatically is default mostly, 
            # but we can enforce some cleaning later.
            df = pd.read_excel(f)
            
            # Standardize 'Date' column if needed, though most looked correct in inspection
            # Ensure Date is datetime
            if 'Date' not in df.columns:
                 # Try to find the date column
                 potential_date_cols = [c for c in df.columns if 'date' in str(c).lower()]
                 if potential_date_cols:
                     df.rename(columns={potential_date_cols[0]: 'Date'}, inplace=True)
                 else:
                     print(f"Warning: No 'Date' column found in {filename}, skipping.")
                     continue
            
            df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
            
            # Drop rows with invalid dates
            df = df.dropna(subset=['Date'])
            
            # Melt the dataframe to long format for easier processing and JSON structure
            # Long format: Date, StationID, Value
            # Get station columns (all except Date)
            station_cols = [c for c in df.columns if c != 'Date']
            
            # Clean station column names (strip whitespace)
            clean_station_cols = {c: str(c).strip() for c in station_cols}
            df = df.rename(columns=clean_station_cols)
            # update station_cols list
            station_cols = list(clean_station_cols.values())
            
            melted = df.melt(id_vars=['Date'], value_vars=station_cols, var_name='StationID', value_name='PM25')
            
            # Drop NaN values to save space
            melted = melted.dropna(subset=['PM25'])
            
            # Convert numeric, coerce errors to NaN then drop
            melted['PM25'] = pd.to_numeric(melted['PM25'], errors='coerce')
            melted = melted.dropna(subset=['PM25'])
            
            all_data.append(melted)
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            
    if not all_data:
        print("No data processed.")
        return

    print("Concatenating all years...")
    full_df = pd.concat(all_data, ignore_index=True)
    
    print(f"Total records: {len(full_df)}")
    
    # Sorting
    full_df = full_df.sort_values(by=['Date', 'StationID'])
    
    # ---------------------------------------------------------
    # Reshaping for frontend optimization
    # Structure:
    # {
    #   "metadata": { "minDate": ..., "maxDate": ..., "stations": [...] },
    #   "data": { "StationID": { "YYYY-MM-DD": value, ... }, ... }
    # }
    # OR simpler Array of Objects if not too huge. 
    # Since we have ~15 years * 365 days * ~50 stations = ~270,000 datapoints. 
    # An array of objects [{"d":"2023-01-01","s":"02T","v":23}, ...] might be around 5-10MB.
    # A dictionary structure might be more compact for lookups.
    # Let's try a dictionary structure: { StationID: [ { d: 'YYYY-MM-DD', v: 12.5 }, ... ] }
    # ---------------------------------------------------------
    
    print("converting to optimized structure...")
    
    stations = full_df['StationID'].unique().tolist()
    min_date = full_df['Date'].min().strftime('%Y-%m-%d')
    max_date = full_df['Date'].max().strftime('%Y-%m-%d')
    
    # ---------------------------------------------------------
    # EXTRACT STATION METADATA
    # ---------------------------------------------------------
    station_names = {}
    try:
        # Assuming metadata is in the 2025 file (or the last file)
        meta_file = os.path.join(DATA_DIR, "PM2.5(2025).xlsx")
        print(f"Reading metadata from {meta_file}...")
        # Read specific sheet, header at row index 1 (0-based) which is row 2 in Excel? 
        # Based on inspection: Row index 1 has "รหัสสถานี" in Unnamed: 2. 
        # Let's read without header and manually select
        meta_df = pd.read_excel(meta_file, sheet_name="รายละเอียดจุดตรวจวัด", header=1)
        
        # Verify columns - based on inspection output:
        # Unnamed: 2 is Code, Unnamed: 3 is Name
        # Actually header=1 should make 'รหัสสถานี' a column if it's in the row.
        # Let's clean the column names to be safe or map by index if names are mapped to 'Unnamed'
        
        # Inspecting previous output: 
        # 1 ... รหัสสถานี ... ชื่อสถานี
        # So providing header=1 should work if pandas aligns it. 
        # Let's rely on column naming if possible, else fallback to index.
        
        # Fallback: iterate and find row. 
        # The inspect output showed:
        # 1  NaN  ลำดับ  รหัสสถานี  ชื่อสถานี  รายละเอียดจุดติดตั้งสถานี
        # So "รหัสสถานี" is in the dataframe if we read with correct header.
        
        # We'll stick to a robust method: read columns `Unnamed: 2` (Code) and `Unnamed: 3` (Name) from row index 3 onwards?
        # Re-reading to be precise based on inspection 
        # Index 1 was header row. 
        # But pandas named them Unnamed because row 0 was NaN? 
        # Let's read fully raw and process.
        
        meta_raw = pd.read_excel(meta_file, sheet_name="รายละเอียดจุดตรวจวัด", header=None)
        # Find the row containing "รหัสสถานี"
        header_row_idx = None
        for i, row in meta_raw.iterrows():
            if list(row).count("รหัสสถานี") > 0:
                header_row_idx = i
                break
        
        if header_row_idx is not None:
            # Set columns
            meta_raw.columns = meta_raw.iloc[header_row_idx]
            # Drop rows before and including header
            meta_clean = meta_raw.iloc[header_row_idx+1:].copy()
            
            # Now we look for columns "รหัสสถานี" and "ชื่อสถานี"
            # Based on inspection, column 3 (index 3) is address which contains province.
            # "รหัสสถานี" is Col 2, "ชื่อสถานี" is Col 3 (Address in our manual inspection showed Col 3 as address but labeled as Name? Wait.)
            # Let's re-verify column mapping from inspection:
            # Row 2 (Header): NaN, ลำดับ, รหัสสถานี, ชื่อสถานี, รายละเอียดจุดติดตั้งสถานี
            # Col Indices:    0,    1,      2,          3,          4
            # Row 4 (Data):   NaN,  1,      02T,        แขวง...กทม., มหาวิทยาลัย...
            
            # So "ชื่อสถานี" (Col 3) seems to clearly contain the Address including Province (e.g. "จ.นนทบุรี"). 
            # Wait, the header says "ชื่อสถานี" (Station Name) but content is address. 
            # And Col 4 "รายละเอียดจุดติดตั้งสถานี" (Installation Details) contains what serves as a better "Display Name" (e.g. "University...").
            
            # Update: 
            # - stationNames should probably come from Col 4 (Installation Details) if available, or Col 3 if not. 
            # - province comes from Col 3 (Address).
            
            # Let's extract both.
            station_provinces = {}
            
            # Columns in meta_clean are labeled by valid header row values.
            # We labeled them via: meta_raw.iloc[header_row_idx]
            # So we access by name "รหัสสถานี", "ชื่อสถานี", "รายละเอียดจุดติดตั้งสถานี"
            
            has_details = "รายละเอียดจุดติดตั้งสถานี" in meta_clean.columns
            
            for _, row in meta_clean.iterrows():
                code = str(row["รหัสสถานี"]).strip()
                if not code or code.lower() == 'nan': continue
                
                address = str(row["ชื่อสถานี"]).strip()
                detail_name = str(row["รายละเอียดจุดติดตั้งสถานี"]).strip() if has_details else ""
                
                # Determine Display Name
                # Use detail_name if valid, else address
                display_name = detail_name if detail_name and detail_name.lower() != 'nan' else address
                station_names[code] = display_name
                
                # Extract Province
                province = "Unknown"
                if "กทม" in address or "กรุงเทพ" in address:
                    province = "Bangkok"
                elif "จ." in address:
                    # Split by "จ." and take the immediate next part, stripping whitespace
                    try:
                        parts = address.split("จ.")
                        if len(parts) > 1:
                            # The province is usually the start of the next part
                            # e.g. "จ.นนทบุรี" -> ["...", "นนทบุรี"]
                            # Clean up potential trailing text? Usually it ends there.
                            province = parts[1].strip().split(" ")[0] # Take first word after จ.
                    except:
                        pass
                
                station_provinces[code] = province

    except Exception as e:
        print(f"Warning: Could not extract station metadata: {e}")

    # Sort metadata lists
    
    # IMPORT REGION MAPPING
    # Since it's a sibling script, we can import it.
    try:
        from region_mapping import get_region
    except ImportError:
        import sys
        sys.path.append(os.path.dirname(__file__))
        from region_mapping import get_region

    station_regions = {}
    for station, province in station_provinces.items():
        station_regions[station] = get_region(province)


    output_data = {
        "metadata": {
            "minDate": min_date,
            "maxDate": max_date,
            "stations": sorted([str(s) for s in stations]), # Ensure strings
            "stationNames": station_names,
            "stationProvinces": station_provinces,
            "stationRegions": station_regions
        },
        "data": {}
    }
    
    # Group by station
    grouped = full_df.groupby('StationID')
    
    for station, group in grouped:
        # Create list of [date_str, value] to save space? Or objects.
        # Objects are easier for Recharts? Recharts usually wants Array of Objects for a single line,
        # or one Array with keys for all lines for comparison.
        # But for *single station* deep dive, specific station data is good.
        # For *comparison*, we might need to merge on the fly in frontend.
        # Let's store as: { StationID: [ { date: 'YYYY-MM-DD', value: 12.3 }, ... ] }
        
        station_str = str(station)
        records = group[['Date', 'PM25']].copy()
        records['date'] = records['Date'].dt.strftime('%Y-%m-%d')
        # rounding to 1 decimal place to save space
        records['value'] = records['PM25'].round(1)
        
        data_list = records[['date', 'value']].to_dict(orient='records')
        output_data['data'][station_str] = data_list
        
    print(f"Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, separators=(',', ':')) # compact json
        
    print("Done!")

if __name__ == "__main__":
    process_data()
