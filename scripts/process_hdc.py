import pandas as pd
import glob
import os
import json
import re

# Constants
HDC_DATA_DIR = "data/HDC"
OUTPUT_FILE = "public/data/hdc_consolidated.json"

# Disease Mapping / Consolidation
# We will group specific ICD codes into broader categories for easier visualization
DISEASE_GROUPS = {
    "Respiratory": [
        "Chronic obstructive pulmonary disease (J44)", 
        "Acute asthma (J45)", 
        "Acute asthma (J44.2)"
    ],
    "Cardiovascular": [
        "Acute ischemic heart diseases (I21)", 
        "Other acute ischemic heart diseases (I24)",
        "Subsequent ST elevation (STEMI) and non-ST elevation (NSTEMI) myocardial infarction (I22)"
    ],
    "Skin/Eye": [
        "Conjunctivitis (H10)",
        "Eczema (L30.9)",
        "Urticaria (L50)"
    ]
}

def process_hdc_data():
    print("--- Starting HDC Data Processing ---")
    
    files = glob.glob(os.path.join(HDC_DATA_DIR, "*_*.csv"))
    consolidated_data = {}
    
    for file_path in files:
        filename = os.path.basename(file_path)
        print(f"Processing {filename}...")
        
        # Parse filename: e.g., "ชลบุรี_2568.csv"
        # 2568 BE = 2025 AD
        try:
            name_part = filename.replace(".csv", "")
            province, year_be = name_part.split("_")
            year_ad = int(year_be) - 543
        except ValueError:
            print(f"Skipping {filename}: Invalid format")
            continue
            
        # We only care about 2025 for now as the user requested "latest year" comparison, 
        # and checking the file list, they are all 2568.
        
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            continue

        # Initialize province data structure
        if province not in consolidated_data:
            consolidated_data[province] = {
                "year": year_ad,
                "weeks": list(range(1, 54)), # Weeks 1-53
                "diseases": {
                    "Respiratory": [0] * 53,
                    "Cardiovascular": [0] * 53,
                    "Skin/Eye": [0] * 53,
                    "Total": [0] * 53
                }
            }
            
        # Process rows
        for _, row in df.iterrows():
            group_name = str(row['group_name']).strip()
            
            # Identify which category this belongs to
            category = None
            for cat, diseases in DISEASE_GROUPS.items():
                if any(d in group_name for d in diseases):
                    category = cat
                    break
            
            # If not in our interested list, we might skip or put in "Other"? 
            # For now, let's only aggregate what we defined to keep charts clean.
            if not category:
                # Optionally check if we want to track everything? 
                # Let's stick to the mapped groups for clarity as requested "ICD-10 related to PM 2.5"
                continue
                
            # Extract weekly data (cols w_01_m to w_53_m)
            # Note: CSV columns might handle w_01_m ...
            # Let's double check column naming from previous view_file: "w_01_m", "w_02_m", ...
            
            for week in range(1, 54):
                col_name = f"w_{week:02d}_m"
                if col_name in df.columns:
                    val = row[col_name]
                    # Handle non-numeric (nulls or strings with commas)
                    try:
                        if pd.isna(val):
                            val = 0
                        elif isinstance(val, str):
                            val = float(val.replace(",", ""))
                        else:
                            val = float(val)
                    except:
                        val = 0
                        
                    # Add to Category
                    consolidated_data[province]["diseases"][category][week-1] += val
                    # Add to Total
                    consolidated_data[province]["diseases"]["Total"][week-1] += val

    # Convert to list/dict structure suitable for JSON
    output = {
        "metadata": {
            "description": "Weekly health data aggregated by province and disease group",
            "source": "HDC",
            "groups": list(DISEASE_GROUPS.keys())
        },
        "data": consolidated_data
    }
    
    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        
    print(f"Done! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    process_hdc_data()
