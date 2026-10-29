import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Bell, CloudRain,
  CloudSun, Compass, Droplets, Globe2, Layers, MapPin, Navigation,
  RefreshCw, Search, ShieldCheck, Sun, Thermometer, Wind
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./style.css";

type Location = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

type Page = "dashboard" | "global" | "alerts";

const DEFAULT_CITY: Location = {
  name: "Lima",
  country: "Perú",
  latitude: -12.0464,
  longitude: -77.0428
};

const CITIES: Location[] = [
  DEFAULT_CITY,
  { name: "Nueva York", country: "Estados Unidos", latitude: 40.7128, longitude: -74.006 },
  { name: "Tokio", country: "Japón", latitude: 35.6762, longitude: 139.6503 },
  { name: "Madrid", country: "España", latitude: 40.4168, longitude: -3.7038 },
  { name: "Sídney", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
  { name: "Londres", country: "Reino Unido", latitude: 51.5074, longitude: -0.1278 }
];

const weatherDescriptions: Record<number, string> = {
  0: "Despejado", 1: "Mayormente despejado",
  2: "Parcialmente nublado", 3: "Nublado",
  45: "Niebla", 48: "Niebla",
  51: "Llovizna", 53: "Llovizna", 55: "Llovizna intensa",
  61: "Lluvia ligera", 63: "Lluvia", 65: "Lluvia intensa",
  71: "Nevada ligera", 73: "Nevada", 75: "Nevada intensa",
  80: "Chubascos", 81: "Chubascos", 82: "Chubascos intensos",
  95: "Tormenta", 96: "Tormenta con granizo", 99: "Tormenta con granizo"
};

function FlyToCity({ location }: { location: Location }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([location.latitude, location.longitude], 7, {
      duration: 1.3
    });
  }, [location, map]);

  return null;
}

function MapClick({ onSelect }: { onSelect: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function riskInfo(current: any) {
  if (!current) return { label: "Sin datos", color: "neutral", message: "Esperando información" };

  const wind = current.wind_speed_10m ?? 0;
  const rain = current.precipitation ?? 0;
  const temp = current.temperature_2m ?? 20;

  if (wind >= 60 || rain >= 15 || temp >= 40 || temp <= -15)
    return { label: "Alto", color: "danger", message: "Condiciones meteorológicas destacadas" };

  if (wind >= 35 || rain >= 5 || temp >= 35 || temp <= -5)
    return { label: "Moderado", color: "warning", message: "Se recomienda prestar atención a las condiciones" };

  return { label: "Bajo", color: "success", message: "Sin umbrales destacados en este análisis" };
}

function Metric({
  title, value, unit, icon, color, detail
}: {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  detail: string;
}) {
  return (
    <div className={"pro-metric " + color}>
      <div className="metric-heading">
        <span>{title}</span>
        {icon}
      </div>
      <div className="metric-number">
        {value}<small>{unit}</small>
      </div>
      <div className="metric-detail">{detail}</div>
      <div className="metric-accent" />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [location, setLocation] = useState<Location>(DEFAULT_CITY);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapStyle, setMapStyle] = useState<"dark" | "street">("dark");
  const [chartType, setChartType] = useState<"temp" | "rain" | "wind">("temp");
  const [updated, setUpdated] = useState("");

  async function getWeather(loc: Location) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        latitude: String(loc.latitude),
        longitude: String(loc.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover",
        hourly: "temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,uv_index_max",
        forecast_days: "7",
        timezone: "auto"
      });

      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?" + params
      );

      if (!response.ok) throw new Error("No se pudo consultar Open-Meteo");

      const data = await response.json();
      setWeather(data);
      setLocation(loc);
      setUpdated(new Date().toLocaleTimeString("es-PE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function findCities(term: string) {
    if (term.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(term) + "&count=6&language=es&format=json"
      );

      const data = await response.json();

      setSuggestions((data.results || []).map((r: any) => ({
        name: r.name,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude
      })));
    } catch {
      setSuggestions([]);
    }
  }

  async function selectCoordinates(lat: number, lon: number) {
    const loc = {
      name: "Ubicación seleccionada",
      country: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      latitude: lat,
      longitude: lon
    };

    await getWeather(loc);
  }

  function chooseCity(loc: Location) {
    setSuggestions([]);
    setQuery("");
    getWeather(loc);
  }

  useEffect(() => {
    getWeather(DEFAULT_CITY);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => findCities(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const current = weather?.current;
  const daily = weather?.daily;
  const hourly = weather?.hourly;
  const risk = riskInfo(current);

  const currentHour = current?.time?.slice(0, 13);

  const hourIndex = hourly?.time?.findIndex(
    (t: string) => t.startsWith(currentHour)
  ) ?? 0;

  const start = Math.max(0, hourIndex);

  const hourlyData = hourly?.time?.slice(start, start + 24).map(
    (time: string, i: number) => ({
      time: time.slice(11, 16),
      temp: hourly.temperature_2m[start + i],
      rain: hourly.precipitation_probability[start + i],
      wind: hourly.wind_speed_10m[start + i]
    })
  ) || [];

  const days = daily?.time?.map((date: string, i: number) => ({
    date,
    max: daily.temperature_2m_max[i],
    min: daily.temperature_2m_min[i],
    rain: daily.precipitation_sum[i],
    code: daily.weather_code[i],
    uv: daily.uv_index_max[i]
  })) || [];

  const chartKey = chartType === "temp" ? "temp" :
    chartType === "rain" ? "rain" : "wind";

  const chartColor = chartType === "temp" ? "#38bdf8" :
    chartType === "rain" ? "#a78bfa" : "#fbbf24";

  const tileUrl = mapStyle === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="climaguard-pro">
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <CloudSun size={29} />
          <span>ClimaGuard <strong>AI</strong></span>
        </div>

        <div className="sidebar-caption">PLATAFORMA DE INTELIGENCIA</div>

        <button className={"side-link " + (page === "dashboard" ? "selected" : "")}
          onClick={() => setPage("dashboard")}>
          <Activity size={18} /> Dashboard
        </button>

        <button className={"side-link " + (page === "global" ? "selected" : "")}
          onClick={() => setPage("global")}>
          <Globe2 size={18} /> Monitoreo global
        </button>

        <button className={"side-link " + (page === "alerts" ? "selected" : "")}
          onClick={() => setPage("alerts")}>
          <Bell size={18} /> Análisis de riesgo
        </button>

        <div className="sidebar-caption">ACCESO RÁPIDO</div>

        {CITIES.slice(0, 5).map(city => (
          <button className="city-link" key={city.name}
            onClick={() => { chooseCity(city); setPage("dashboard"); }}>
            <MapPin size={14} /> {city.name}
          </button>
        ))}

        <div className="sidebar-footer">
          <span className="status-dot" /> SISTEMA OPERATIVO
          <p>ClimaGuard AI · Versión 3.0</p>
          <p>Datos meteorológicos: Open-Meteo</p>
        </div>
      </aside>

      <main className="pro-main">
        <header className="pro-header">
          <div>
            <div className="eyebrow">GLOBAL CLIMATE INTELLIGENCE PLATFORM</div>
            <h1>{page === "dashboard" ? "Centro de operaciones climáticas" :
              page === "global" ? "Explorador meteorológico mundial" :
              "Centro de análisis de riesgos"}</h1>
            <p>Monitoreo meteorológico, análisis geoespacial y pronósticos globales.</p>
          </div>
          <div className="system-status"><span className="status-dot" /> DATOS EN LÍNEA</div>
        </header>

        <section className="pro-search-row">
          <div className="pro-search">
            <Search size={19} />
            <input placeholder="Buscar ciudad o país..."
              value={query} onChange={e => setQuery(e.target.value)} />
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((city, i) => (
                  <button key={i} onClick={() => chooseCity(city)}>
                    <MapPin size={15} /> {city.name}, {city.country}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="pro-action" onClick={() => getWeather(location)}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </section>

        {error && <div className="pro-error">{error}</div>}

        <div className="pro-location">
          <span><MapPin size={17} /> {location.name}, {location.country}</span>
          <span>{loading ? "Consultando datos..." : `Actualizado: ${updated || "--"}`}</span>
        </div>

        <section className="pro-metrics">
          <Metric title="TEMPERATURA" value={current?.temperature_2m ?? "--"}
            unit="°C" icon={<Thermometer />} color="cyan"
            detail={`Sensación: ${current?.apparent_temperature ?? "--"} °C`} />
          <Metric title="HUMEDAD RELATIVA" value={current?.relative_humidity_2m ?? "--"}
            unit="%" icon={<Droplets />} color="blue"
            detail="Humedad ambiental" />
          <Metric title="VELOCIDAD DEL VIENTO" value={current?.wind_speed_10m ?? "--"}
            unit="km/h" icon={<Wind />} color="amber"
            detail={`Dirección: ${current?.wind_direction_10m ?? "--"}°`} />
          <Metric title="PRECIPITACIÓN ACTUAL" value={current?.precipitation ?? "--"}
            unit="mm" icon={<CloudRain />} color="purple"
            detail="Medición actual" />
        </section>

        <section className="pro-workspace">
          <div className="pro-panel pro-map-panel">
            <div className="pro-panel-heading">
              <div>
                <h2><Globe2 size={18} /> Explorador geoespacial</h2>
                <p>Cartografía interactiva y ubicación meteorológica</p>
              </div>
              <div className="map-controls">
                <button className={mapStyle === "dark" ? "chosen" : ""}
                  onClick={() => setMapStyle("dark")}>Oscuro</button>
                <button className={mapStyle === "street" ? "chosen" : ""}
                  onClick={() => setMapStyle("street")}>Calles</button>
              </div>
            </div>

            <div className="pro-map">
              <MapContainer center={[location.latitude, location.longitude]}
                zoom={6} scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}>
                <TileLayer key={mapStyle} url={tileUrl}
                  attribution='&copy; OpenStreetMap contributors &copy; CARTO' />
                <FlyToCity location={location} />
                <MapClick onSelect={selectCoordinates} />
                <CircleMarker center={[location.latitude, location.longitude]}
                  radius={10} pathOptions={{
                    color: "#ffffff", fillColor: "#00c8ff",
                    fillOpacity: 1, weight: 3
                  }}>
                  <Popup>
                    <strong>{location.name}</strong>
                    <div>Temperatura: {current?.temperature_2m ?? "--"} °C</div>
                    <div>Viento: {current?.wind_speed_10m ?? "--"} km/h</div>
                  </Popup>
                </CircleMarker>
              </MapContainer>

              <div className="map-floating">
                <span className="status-dot" /> UBICACIÓN ACTIVA
                <strong>{location.name}</strong>
                <small>{location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°</small>
              </div>
            </div>

            <div className="map-bottom">
              <span><Navigation size={14} /> Haz clic en el mapa para consultar otra ubicación</span>
              <span><Layers size={14} /> Cartografía base</span>
            </div>
          </div>

          <div className="pro-right">
            <div className="pro-panel">
              <div className="pro-panel-heading">
                <div>
                  <h2><ShieldCheck size={18} /> Análisis meteorológico</h2>
                  <p>Evaluación experimental por umbrales</p>
                </div>
              </div>
              <div className="risk-summary">
                <span className={"risk-indicator " + risk.color}>
                  <AlertTriangle size={18} /> Riesgo {risk.label}
                </span>
                <p>{risk.message}</p>
              </div>
              <div className="condition-list">
                <div><span>Condición</span><strong>{weatherDescriptions[current?.weather_code] || "Sin datos"}</strong></div>
                <div><span>Nubosidad</span><strong>{current?.cloud_cover ?? "--"}%</strong></div>
                <div><span>Precipitación</span><strong>{current?.precipitation ?? "--"} mm</strong></div>
                <div><span>Viento</span><strong>{current?.wind_speed_10m ?? "--"} km/h</strong></div>
              </div>
              <p className="pro-disclaimer">No constituye una alerta oficial ni predice inundaciones. Los umbrales son demostrativos.</p>
            </div>

            <div className="pro-panel">
              <div className="pro-panel-heading">
                <div>
                  <h2><Compass size={18} /> Información geográfica</h2>
                  <p>Coordenadas de la ubicación seleccionada</p>
                </div>
              </div>
              <div className="condition-list">
                <div><span>Latitud</span><strong>{location.latitude.toFixed(4)}°</strong></div>
                <div><span>Longitud</span><strong>{location.longitude.toFixed(4)}°</strong></div>
                <div><span>Zona horaria</span><strong>{weather?.timezone || "--"}</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="pro-panel pro-chart-panel">
          <div className="pro-panel-heading">
            <div>
              <h2><Activity size={18} /> Análisis meteorológico horario</h2>
              <p>Pronóstico de las próximas 24 horas</p>
            </div>
            <div className="chart-tabs">
              <button className={chartType === "temp" ? "chosen" : ""}
                onClick={() => setChartType("temp")}>Temperatura</button>
              <button className={chartType === "rain" ? "chosen" : ""}
                onClick={() => setChartType("rain")}>Lluvia</button>
              <button className={chartType === "wind" ? "chosen" : ""}
                onClick={() => setChartType("wind")}>Viento</button>
            </div>
          </div>
          <div className="pro-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="weatherGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#21364c" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="time" stroke="#8ba6c0" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8ba6c0" tick={{ fontSize: 11 }}
                  domain={chartType === "rain" ? [0, 100] : ["auto", "auto"]} />
                <Tooltip contentStyle={{
                  background: "#10243a", border: "1px solid #31516e",
                  borderRadius: 10, color: "#fff"
                }} />
                <Area type="monotone" dataKey={chartKey}
                  stroke={chartColor} fill="url(#weatherGradient)"
                  strokeWidth={3} name={chartType === "temp" ? "Temperatura °C" :
                    chartType === "rain" ? "Probabilidad %" : "Viento km/h"} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="pro-panel pro-forecast">
          <div className="pro-panel-heading">
            <div>
              <h2><Sun size={18} /> Pronóstico extendido de 7 días</h2>
              <p>Temperaturas máximas, mínimas, lluvia y radiación UV</p>
            </div>
          </div>
          <div className="forecast-grid">
            {days.map((day: any) => (
              <div className="forecast-day" key={day.date}>
                <div className="forecast-date">{new Date(day.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })}</div>
                <CloudSun size={28} color="#52c9ff" />
                <strong>{day.max}°</strong>
                <small>Mín {day.min}°</small>
                <div className="forecast-rain"><Droplets size={13} /> {day.rain} mm</div>
                <div className="forecast-uv">UV máx: {day.uv ?? "--"}</div>
              </div>
            ))}
          </div>
        </section>

        {page === "global" && (
          <section className="pro-panel extra-section">
            <h2>Ciudades destacadas</h2>
            <div className="quick-cities">
              {CITIES.map(city => (
                <button key={city.name} onClick={() => chooseCity(city)}>
                  <Globe2 size={17} /> {city.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {page === "alerts" && (
          <section className="pro-panel extra-section">
            <h2>Interpretación del nivel de riesgo</h2>
            <div className="risk-guide">
              <div><span className="risk-indicator success">BAJO</span><p>Sin umbrales destacados.</p></div>
              <div><span className="risk-indicator warning">MODERADO</span><p>Condiciones que requieren atención.</p></div>
              <div><span className="risk-indicator danger">ALTO</span><p>Se superan umbrales experimentales.</p></div>
            </div>
          </section>
        )}

        <footer className="pro-footer">
          ClimaGuard AI © 2026 · Plataforma experimental de inteligencia meteorológica · Fuente: Open-Meteo
        </footer>
      </main>
    </div>
  );
}
