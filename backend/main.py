# main.py
import asyncio
import json
import random
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from influxdb_client import InfluxDBClient, Point, WritePrecision

INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "SdNnjDZQtmC3NqcvExpqSugL2DOjMUzjqzPYVhJn0c8Njpa86MbglD85ccNOdRRjMv2FA7OCgIt64Eo7uLW1EQ=="  # copy from Influx UI
INFLUX_ORG = "my-org"
INFLUX_BUCKET = "iot_data"

influx_client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
write_api = influx_client.write_api()
app = FastAPI(title="IoT Sim Backend")
def write_influx(device_id: str, payload: dict, ts: str):
    point = (
        Point("iot_measurement")
        .tag("device_id", device_id)
        .time(ts, WritePrecision.NS)
    )
    for k, v in payload.items():
        if isinstance(v, (int, float)):
            point = point.field(k, v)
    write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)

# Allow the Vite dev server origin(s)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# in-memory storage
connected_websockets = set()  # set[WebSocket]
devices: Dict[str, Dict[str, Any]] = {}
history: Dict[str, list] = {}

def iso_ts():
    return datetime.now(timezone.utc).isoformat()

# Create a few simulated devices
NUM_TEMP = 3
NUM_GPS = 3

for i in range(NUM_TEMP):
    device_id = f"temp-{i+1}"
    devices[device_id] = {
        "id": device_id,
        "type": "temp_sensor",
        "name": f"PlantSensor-{i+1}",
        "threshold": 75.0,  # threshold in F
        "last": None,
        "meta": {"plant": f"Plant {i+1}"}
    }
    history[device_id] = []

for i in range(NUM_GPS):
    device_id = f"gps-{i+1}"
    # start near some city (example coordinates)
    devices[device_id] = {
        "id": device_id,
        "type": "gps",
        "name": f"Truck-{i+1}",
        "last": None,
        "meta": {"route": f"Route {i+1}"}
    }
    history[device_id] = []

async def broadcast(msg: dict):
    text = json.dumps(msg)
    to_remove = []
    for ws in list(connected_websockets):
        try:
            await ws.send_text(text)
        except Exception:
            to_remove.append(ws)
    for ws in to_remove:
        connected_websockets.discard(ws)

# Simulators
async def simulate_temp(device_id: str):
    base = 68 + random.random()*8  # base temp
    while True:
        temp = base + random.gauss(0, 2)
        humidity = 40 + random.gauss(0, 5)
        ts = iso_ts()
        payload = {"temperature": round(temp, 2), "humidity": round(humidity, 1)}
        devices[device_id]["last"] = payload
        history[device_id].append({"ts": ts, **payload})
        if len(history[device_id]) > 200:
            history[device_id].pop(0)

        msg = {
            "type": "reading",
            "device_id": device_id,
            "device_type": "temp_sensor",
            "payload": payload,
            "timestamp": ts,
        }
        await broadcast(msg)

        # alert logic
        threshold = devices[device_id].get("threshold", 75.0)
        if temp > threshold:
            alert = {
                "type": "alert",
                "device_id": device_id,
                "severity": "critical",
                "message": f"Temperature {temp:.1f}F above threshold {threshold:.1f}F",
                "timestamp": ts,
            }
            await broadcast(alert)

        await asyncio.sleep(2)  # every 2s
        # payload = {"temperature": round(temp, 2), "humidity": round(humidity, 1)}
        # devices[device_id]["last"] = payload
        # history[device_id].append({"ts": ts, **payload})
        # write_influx(device_id, payload, ts)
        write_influx(device_id, payload, ts)



async def simulate_gps(device_id: str):
    # starting position somewhere (sample coordinates)
    lat = 37.77 + random.uniform(-0.02, 0.02)
    lon = -122.42 + random.uniform(-0.02, 0.02)
    speed = random.uniform(20, 40)  # mph
    while True:
        # move a little
        lat += random.uniform(-0.0008, 0.0008) + (speed / 10000)
        lon += random.uniform(-0.0008, 0.0008)
        ts = iso_ts()
        payload = {"lat": round(lat, 6), "lon": round(lon, 6), "speed": round(speed, 1)}
        devices[device_id]["last"] = payload
        history[device_id].append({"ts": ts, **payload})
        if len(history[device_id]) > 200:
            history[device_id].pop(0)

        msg = {
            "type": "reading",
            "device_id": device_id,
            "device_type": "gps",
            "payload": payload,
            "timestamp": ts,
        }
        await broadcast(msg)

        # random warning if speed jumps
        if speed > 70:
            alert = {
                "type": "alert",
                "device_id": device_id,
                "severity": "warning",
                "message": f"High speed detected: {speed:.1f} mph",
                "timestamp": ts,
            }
            await broadcast(alert)

        # small speed variation
        speed += random.uniform(-3, 3)
        speed = max(0, min(80, speed))
        await asyncio.sleep(2)
        # payload = {"lat": round(lat, 6), "lon": round(lon, 6), "speed": round(speed, 1)}
        # devices[device_id]["last"] = payload
        # history[device_id].append({"ts": ts, **payload})
        # write_influx(device_id, payload, ts)
        write_influx(device_id, payload, ts)



@app.on_event("startup")
async def startup_event():
    # start simulator tasks
    for dev in list(devices.values()):
        if dev["type"] == "temp_sensor":
            asyncio.create_task(simulate_temp(dev["id"]))
        elif dev["type"] == "gps":
            asyncio.create_task(simulate_gps(dev["id"]))

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.add(websocket)
    # send device list initially
    try:
        await websocket.send_text(json.dumps({"type": "device_list", "devices": list(devices.values())}))
        while True:
            # server doesn't expect specialized messages from client in this MVP,
            # but keep the receive to detect disconnects cleanly.
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
            except Exception:
                # timeouts or ignore any non-text frames
                await asyncio.sleep(0.1)
    finally:
        connected_websockets.discard(websocket)

# REST endpoints for convenience
@app.get("/devices")
def list_devices():
    return {"devices": list(devices.values())}

@app.get("/history/{device_id}")
def device_history(device_id: str):
    return {"history": history.get(device_id, [])}


