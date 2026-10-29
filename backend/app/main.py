from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI(title="ClimaGuard AI API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET"], allow_headers=["*"])

@app.get('/api/health')
def health():
    return {"status": "ok"}

@app.get('/api/cities')
async def cities(q: str = Query(min_length=2, max_length=100)):
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get('https://geocoding-api.open-meteo.com/v1/search', params={'name': q, 'count': 8, 'language': 'es', 'format': 'json'})
            response.raise_for_status()
            return response.json().get('results', [])
    except httpx.HTTPError:
        raise HTTPException(502, 'No se pudo consultar el buscador de ciudades')

@app.get('/api/weather')
async def weather(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    params = {'latitude': lat, 'longitude': lon, 'timezone': 'auto', 'forecast_hours': 24, 'forecast_days': 5,
              'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code',
              'hourly': 'temperature_2m,precipitation_probability,precipitation',
              'daily': 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code'}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get('https://api.open-meteo.com/v1/forecast', params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError:
        raise HTTPException(502, 'No se pudo consultar el pronóstico meteorológico')
