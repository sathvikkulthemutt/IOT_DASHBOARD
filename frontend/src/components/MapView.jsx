import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icon imports for many bundlers
import markerUrl from "leaflet/dist/images/marker-icon.png";
import markerRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerRetinaUrl,
  iconUrl: markerUrl,
  shadowUrl: markerShadow,
});

export default function MapView({ gpsDevices }) {
  // center map to first device if available
  const center = gpsDevices && gpsDevices.length > 0 && gpsDevices[0].last
    ? [gpsDevices[0].last.lat, gpsDevices[0].last.lon]
    : [37.77, -122.42];

  return (
    <MapContainer center={center} zoom={12} style={{height:'100%', width:'100%'}}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {gpsDevices.map(d => (
        d.last ? (
          <Marker key={d.id} position={[d.last.lat, d.last.lon]}>
            <Popup>
              <div style={{minWidth:160}}>
                <div><b>{d.name || d.id}</b></div>
                <div>Speed: {d.last.speed} mph</div>
                <div>Route: {d.meta?.route}</div>
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
}
