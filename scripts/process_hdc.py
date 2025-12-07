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
        
        # Parse filename
        # Expected formats: "Province_2568.csv", "Province_2567.csv", "Province_2567csv.csv"
        # 2567 BE = 2024 AD, 2568 BE = 2025 AD
        
        try:
            # Clean up known typos first
            clean_name = filename.replace("csv.csv", ".csv")
            name_part = clean_name.replace(".csv", "")
            
            # Split by last underscore to separate province and year
            if "_" in name_part:
                province = name_part.rsplit("_", 1)[0]
                year_part = name_part.rsplit("_", 1)[1]
                # Extract just the year digits
                year_be = int(re.search(r'\d{4}', year_part).group())
                year_ad = year_be - 543
            else:
                 print(f"Skipping {filename}: No underscore found")
                 continue

        except Exception as e:
            print(f"Skipping {filename}: Parsing name failed ({e})")
            continue
            
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            continue

        # Initialize province data structure if needed
        if province not in consolidated_data:
            consolidated_data[province] = {}
            
        # Initialize Year structure
        if year_ad not in consolidated_data[province]:
             consolidated_data[province][year_ad] = {
                "weeks": list(range(1, 54)), # Weeks 1-53
                "diseases": {
                    "Respiratory": [0] * 53,
                    "Cardiovascular": [0] * 53,
                    "Skin/Eye": [0] * 53,
                    "Total": [0] * 53
                }
            }

        target_data = consolidated_data[province][year_ad]

        # Process rows
        for _, row in df.iterrows():
            group_name = str(row['group_name']).strip()
            
            # Identify which category this belongs to
            category = None
            for cat, diseases in DISEASE_GROUPS.items():
                if any(d in group_name for d in diseases):
                    category = cat
                    break
            
            if not category:
                continue
            
            for week in range(1, 54):
                col_name = f"w_{week:02d}_m"
                if col_name in df.columns:
                    val = row[col_name]
                    # Handle non-numeric
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
                    target_data["diseases"][category][week-1] += val
                    # Add to Total
                    target_data["diseases"]["Total"][week-1] += val

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
