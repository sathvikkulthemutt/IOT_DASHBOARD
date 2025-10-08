# 📊 IoT Real-Time Dashboard

A fully functional IoT dashboard simulating factory and logistics IoT devices. Provides **real-time alerts** via React frontend and **historical analytics** via InfluxDB + Grafana.

🌡️ Features: Temperature & Humidity Monitoring, Logistics Tracking (GPS + Speed), Real-Time Alerts, Historical Visualization with Grafana dashboards, Mock IoT data generated every 2 seconds.

🛠️ Tech Stack: Backend → FastAPI (WebSocket + InfluxDB writer), Frontend → React, Database → InfluxDB 2.x, Visualization → Grafana, Messaging → WebSockets.

# 📂 Project Structure:
iot-dashboard/
│── backend/ # FastAPI backend (IoT simulator + API + InfluxDB writer)
│── frontend/ # React dashboard UI
│── grafana/ # Grafana dashboard JSON file
│── README.md


# ⚙️ Setup & Run Locally (copy and paste commands in terminal):
```bash
# Clone repository
git clone https://github.com/your-username/iot-dashboard.git
cd iot-dashboard

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Backend runs at http://localhost:8000

# Frontend
cd ../frontend
npm install
npm start
# Frontend runs at http://localhost:3000

# InfluxDB
# Open UI: http://localhost:8086, login: admin/admin***, Org: my-org, Bucket: iot_data
# Verify Data Explorer:
from(bucket: "iot_data") |> range(start: -5m)

# Grafana
# Open Grafana: http://localhost:3001, login: admin/admin
# Dashboards → Import → Paste JSON below → Select InfluxDB datasource


📊 Grafana Dashboard JSON:
{
  "id": null,
  "title": "IoT Realtime Dashboard",
  "timezone": "browser",
  "schemaVersion": 36,
  "version": 1,
  "refresh": "5s",
  "panels": [
    {"type": "timeseries","title": "Temperature Over Time","datasource": null,"targets":[{"query":"from(bucket: \"iot_data\") |> range(start: -1h) |> filter(fn: (r) => r._measurement == \"iot_measurement\" and r._field == \"temperature\")","refId":"A"}],"gridPos":{"x":0,"y":0,"w":12,"h":8}},
    {"type": "timeseries","title": "Humidity Over Time","datasource": null,"targets":[{"query":"from(bucket: \"iot_data\") |> range(start: -1h) |> filter(fn: (r) => r._measurement == \"iot_measurement\" and r._field == \"humidity\")","refId":"B"}],"gridPos":{"x":12,"y":0,"w":12,"h":8}},
    {"type": "timeseries","title": "Truck Speed","datasource": null,"targets":[{"query":"from(bucket: \"iot_data\") |> range(start: -1h) |> filter(fn: (r) => r._measurement == \"iot_measurement\" and r._field == \"speed\")","refId":"C"}],"gridPos":{"x":0,"y":8,"w":12,"h":8}},
    {"type": "geomap","title": "Truck Locations","datasource": null,"targets":[{"query":"from(bucket: \"iot_data\") |> range(start: -15m) |> filter(fn: (r) => r._measurement == \"iot_measurement\" and (r._field == \"lat\" or r._field == \"lon\"))","refId":"D"}],"gridPos":{"x":12,"y":8,"w":12,"h":8},"options":{"view":{"lat":37.77,"lon":-122.42,"zoom":11},"basemap":{"type":"osm"}}}
  ]
}

⚡ Alerts in Grafana:

Open Temperature panel → Edit → Alerts

Condition: avg() of temperature > 75°F for 5m

Configure notification channel (Email, Slack, etc.)


📜 License: MIT License. Free to use & modify.
