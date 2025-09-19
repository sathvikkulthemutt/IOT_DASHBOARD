import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import DeviceChart from "./components/DeviceChart";
import MapView from "./components/MapView";

const WS_URL = (import.meta.env.VITE_WS_URL) ? import.meta.env.VITE_WS_URL : "ws://localhost:8000/ws";

export default function App() {
  const [devices, setDevices] = useState({}); // id -> device info
  const [histories, setHistories] = useState({}); // id -> array
  const [alerts, setAlerts] = useState([]); // active alerts
  const [selectedDevice, setSelectedDevice] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // open websocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => console.log("WebSocket connected");
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        handleMessage(m);
      } catch (err) {
        console.error("Malformed message", err);
      }
    };
    ws.onclose = () => console.log("WebSocket closed");
    return () => ws.close();
  }, []);

  const handleMessage = (m) => {
    if (m.type === "device_list") {
      // convert list to map
      const map = {};
      m.devices.forEach((d) => map[d.id] = d);
      setDevices(map);
      // initialize histories
      const h = {};
      m.devices.forEach(d => h[d.id] = []);
      setHistories(h);
    } else if (m.type === "reading") {
      setDevices(prev => ({ ...prev, [m.device_id]: { ...(prev[m.device_id] || {}), last: m.payload, type: m.device_type } }));
      setHistories(prev => {
        const arr = (prev[m.device_id] || []).concat([{ ts: m.timestamp, ...m.payload }]);
        if (arr.length > 200) arr.shift();
        return { ...prev, [m.device_id]: arr };
      });
      // auto-select first temp sensor
      if (!selectedDevice) {
        setSelectedDevice(m.device_id);
      }
    } else if (m.type === "alert") {
      const id = `${m.device_id}-${Date.now()}`;
      const newAlert = { id, ...m };
      setAlerts(prev => [newAlert, ...prev]);
      // auto clear after 14s
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, 14000);
    }
  };

  const tempSensors = Object.values(devices).filter(d => d?.type === "temp_sensor");
  const gpsDevices = Object.values(devices).filter(d => d?.type === "gps");

  return (
    <div className="app">
      <div className="panel">
        <div className="header">Devices</div>
        <div>
          <div style={{fontWeight:600}}>Temperature Sensors</div>
          {tempSensors.map(d => (
            <div key={d.id} className={"device online"} onClick={() => setSelectedDevice(d.id)} style={{cursor:'pointer'}}>
              <div>
                <div>{d.name || d.id}</div>
                <div style={{fontSize:12,color:'#6b7280'}}>{d.meta?.plant || ''}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700}}>{d.last?.temperature ?? '—'}°F</div>
                <div style={{fontSize:12,color:'#6b7280'}}>{d.last?.humidity ? `${d.last.humidity}%` : ''}</div>
              </div>
            </div>
          ))}

          <div style={{height:12}} />

          <div style={{fontWeight:600}}>Fleet / GPS</div>
          {gpsDevices.map(d => (
            <div key={d.id} className={"device online"}>
              <div>{d.name || d.id}</div>
              <div style={{textAlign:'right'}}>{d.last ? `${d.last.speed} mph` : '—'}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:12, fontSize:12,color:'#6b7280'}}>
          WebSocket: {WS_URL}
        </div>
      </div>

      <div>
        <div className="panel" style={{height:'100%', display:'flex', flexDirection:'column', gap:12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontWeight:700}}>Real-time Map & Chart</div>
            <div style={{fontSize:12,color:'#6b7280'}}>Updates every 2s</div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 420px', gap:12, alignItems:'start'}}>
            <div className="map-container" style={{height:420}}>
              <MapView gpsDevices={gpsDevices} />
            </div>

            <div className="panel" style={{height:420}}>
              <div className="header">Live Chart</div>
              {selectedDevice ? (
                <DeviceChart
                  data={histories[selectedDevice] || []}
                  device={devices[selectedDevice]}
                />
              ) : (
                <div>No device selected yet.</div>
              )}
            </div>
          </div>

          <div style={{marginTop:8}}>
            <div className="header">Activity (recent)</div>
            <div style={{height:140, overflow:'auto'}}>
              {Object.entries(histories).slice(0,6).map(([id, arr]) => {
                const last = arr[arr.length-1];
                return last ? (
                  <div key={id} style={{fontSize:13, padding:'6px 0', borderBottom:'1px solid #eef2ff'}}>
                    <b>{id}</b> — {JSON.stringify(last)}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="header">Alerts</div>
        <div>
          {alerts.length === 0 && <div style={{color:'#6b7280'}}>No active alerts</div>}
          {alerts.map(a => (
            <div key={a.id} className={`alert ${a.severity === 'critical' ? 'critical' : 'warning'}`}>
              <div style={{fontSize:14}}>{a.message}</div>
              <div style={{fontSize:12, opacity:0.9}}>{a.device_id} • {new Date(a.timestamp).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
