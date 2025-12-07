import pandas as pd

file_path = "data/PM25/PM2.5(2025).xlsx"
sheet_name = "รายละเอียดจุดตรวจวัด"

try:
    df = pd.read_excel(file_path, sheet_name=sheet_name)
    print(df.head().to_string())
    print("\nColumns:", df.columns.tolist())
except Exception as e:
    print(f"Error reading sheet: {e}")
