import pandas as pd
import glob
import os

data_dir = "data/PM25"
files = sorted(glob.glob(os.path.join(data_dir, "*.xlsx")))

for f in files:
    print(f"--- File: {os.path.basename(f)} ---")
    try:
        df = pd.read_excel(f)
        print(f"Shape: {df.shape}")
        print("Columns:", df.columns.tolist())
        print(df.head(3).to_string())
        print("\n")
    except Exception as e:
        print(f"Error reading {f}: {e}\n")
