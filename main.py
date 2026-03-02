from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import requests
import asyncio
import os

app = FastAPI()

# Para servir a pasta static se necessário
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

matches_cache = []

def get_decimal_odd(fraction_str):
    try:
        num, den = fraction_str.split('/')
        return round(1 + (int(num)/int(den)), 2)
    except:
        return 0.0

async def real_time_scraper_task():
    global matches_cache
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
        "Origin": "https://www.sofascore.com",
        "Referer": "https://www.sofascore.com/"
    }
    
    while True:
        try:
            # Endpoint 100% real de apostas mundiais via agregador
            res = requests.get('https://api.sofascore.com/api/v1/sport/football/events/live', headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                events = data.get('events', [])
                
                scraped_data = []
                # Pega as primeiras 8 partidas ao vivo
                for e in events[:8]:
                    event_id = e.get('id')
                    home = e.get('homeTeam', {}).get('name', 'Time A')
                    away = e.get('awayTeam', {}).get('name', 'Time B')
                    
                    # Correção: homeScore e awayScore nem sempre tem a chave 'current', às vezes é 'display'
                    h_score = e.get('homeScore', {}).get('display', e.get('homeScore', {}).get('current', 0))
                    a_score = e.get('awayScore', {}).get('display', e.get('awayScore', {}).get('current', 0))
                    
                    status = e.get('status', {}).get('description', 'Ao Vivo')
                    time_status = f"{e.get('time', {}).get('current', 0)}'" if e.get('time') else "LIVE"
                    
                    v1, x, v2 = 0.0, 0.0, 0.0
                    
                    # Pegamos as Cotações reais de grandes casas através desse pool secundário para furar bloqueios de bots
                    try:
                        odds_res = requests.get(f'https://api.sofascore.com/api/v1/event/{event_id}/odds/1/all', headers=headers, timeout=5)
                        if odds_res.status_code == 200:
                            odds_data = odds_res.json()
                            markets = odds_data.get('markets', [])
                            if markets:
                                choices = markets[0].get('choices', [])
                                if len(choices) >= 3:
                                    v1 = get_decimal_odd(choices[0].get('fractionalValue', "1/1"))
                                    x  = get_decimal_odd(choices[1].get('fractionalValue', "1/1"))
                                    v2 = get_decimal_odd(choices[2].get('fractionalValue', "1/1"))
                    except Exception as e:
                        print("Erro interno ao pegar odd", e)

                    scraped_data.append({
                        "home": home,
                        "away": away,
                        "home_score": h_score,
                        "away_score": a_score,
                        "status": "LIVE" if status == "Live" else status,
                        "time": time_status,
                        "v1": v1,
                        "x": x,
                        "v2": v2
                    })
                
                if scraped_data:
                    matches_cache = scraped_data

        except Exception as e:
            print("⚠️ Erro no Scraper de Background:", e)
            
        await asyncio.sleep(8)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(real_time_scraper_task())

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

@app.get("/api/matches")
def get_matches():
    return {"status": "success", "data": matches_cache}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
