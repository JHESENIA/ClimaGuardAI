# ClimaGuard AI — MVP

Dashboard meteorológico global con React, TypeScript, Recharts, FastAPI y Open-Meteo.

## Requisitos
Node.js 20+ y Python 3.10+.

## Backend (terminal 1)
```bash
cd backend
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API: http://localhost:8000/docs

## Frontend (terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Abrir http://localhost:5173

La app necesita conexión a internet para consultar Open-Meteo. La ciudad inicial es Lima. El indicador de riesgo es experimental y no representa alertas oficiales. Para desplegar en producción configurar CORS, HTTPS, cache, límites de solicitudes y condiciones de licencia de Open-Meteo.
