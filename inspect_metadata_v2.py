import pandas as pd

file_path = "data/PM25/PM2.5(2025).xlsx"
sheet_name = "รายละเอียดจุดตรวจวัด"
df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
print(df.iloc[20:40].to_string())
