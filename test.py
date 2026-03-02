import requests
import json

try:
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get('https://br.betano.com/api/sport/futebol/jogos-de-hoje/?req=la,s,stn,c,mb', headers=headers)
    print("STATUS", res.status_code)
    try:
        data = res.json()
        print(list(data.keys()))
    except:
        print(res.text[:200])
except Exception as e:
    print("ERROR", e)
