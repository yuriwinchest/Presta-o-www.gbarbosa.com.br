import pandas as pd
import json

df = pd.read_excel("arquivos/copia-de-analise-gbarbosa-diario.xlsx", sheet_name=None)
for sheet, data in df.items():
    print(f"--- Sheet: {sheet} ---")
    print("Columns:", list(data.columns))
    print("Row count:", len(data))
    print("Sample data:")
    print(data.head(3).to_markdown())
    print("\n")
