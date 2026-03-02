import requests
import json

def test():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
        "Origin": "https://www.sofascore.com",
        "Referer": "https://www.sofascore.com/"
    }
    res = requests.get('https://api.sofascore.com/api/v1/sport/football/events/live', headers=headers)
    if res.status_code == 200:
        data = res.json()
        events = data.get('events', [])
        print(f"Encontrou {len(events)} jogos rolando")
        
        for e in events[:2]:
            event_id = e['id']
            home = e['homeTeam']['name']
            away = e['awayTeam']['name']
            h_score = e.get('homeScore', {}).get('current', 0)
            a_score = e.get('awayScore', {}).get('current', 0)
            status = e.get('status', {}).get('description', 'Live')
            
            # Buscando as odds da bet365 dentro do sofascore
            odds_res = requests.get(f'https://api.sofascore.com/api/v1/event/{event_id}/odds/1/all', headers=headers)
            v1, x, v2 = 0, 0, 0
            if odds_res.status_code == 200:
                odds_data = odds_res.json()
                markets = odds_data.get('markets', [])
                if markets:
                    choices = markets[0].get('choices', [])
                    if len(choices) >= 3:
                        v1 = choices[0].get('fractionalValue', "1/1") # Ou decimal
                        x  = choices[1].get('fractionalValue', "1/1")
                        v2 = choices[2].get('fractionalValue', "1/1")
            
            print(f"{home} {h_score} x {a_score} {away} ({status}) | Odds: {v1} / {x} / {v2}")
    else:
        print("Erro", res.status_code)

test()
