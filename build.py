import pandas as pd
import json
import numpy as np
import os

def clean_data(df):
    # Replace NaN with None
    df = df.replace({np.nan: None})
    # Convert any remaining datetime columns to string
    for col in df.select_dtypes(include=['datetime64', 'datetimetz']).columns:
        df[col] = df[col].astype(str)
    return df.to_dict(orient="records")

def format_date(dt):
    if pd.isna(dt):
        return None
    try:
        return dt.strftime("%Y-%m-%d")
    except:
        return str(dt)

def main():
    file_path = "arquivos/copia-de-analise-gbarbosa-diario.xlsx"
    
    # Sheet 1: FEV
    df_fev = pd.read_excel(file_path, sheet_name="FEV", skiprows=1)
    # clean column names
    df_fev.columns = df_fev.columns.str.strip().str.replace("\n", " ")
    
    # process dates
    if "Data" in df_fev.columns:
        df_fev["Data"] = pd.to_datetime(df_fev["Data"]).apply(format_date)
    
    # remove rows where Data is null or total row
    df_fev = df_fev[df_fev["Data"].notna()]
    
    
    # Sheet 2: ultimos 6 meses
    df_hist = pd.read_excel(file_path, sheet_name="ultimos 6 meses")
    # rename Unnamed: 0 to Mes
    df_hist.rename(columns={"Unnamed: 0": "Mês"}, inplace=True)
    df_hist.columns = df_hist.columns.str.strip().str.replace("\n", " ")
    
    if "Mês" in df_hist.columns:
        df_hist["Mês"] = pd.to_datetime(df_hist["Mês"]).dt.strftime("%b %Y")
        
    df_hist = df_hist[df_hist["Mês"].notna() & (df_hist["Mês"] != "NaT")]

    data = {
        "fev": clean_data(df_fev),
        "historico": clean_data(df_hist)
    }

    os.makedirs("public", exist_ok=True)
    with open("public/data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    print("Data successfully generated to public/data.json")

if __name__ == "__main__":
    main()
