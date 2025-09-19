import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function DeviceChart({ data, device }) {
  // data is array of {ts, temperature, humidity} or gps
  const plot = (device?.type === "temp_sensor");

  // map timestamps to human-friendly labels
  const formatted = data.map(d => ({ ...d, label: new Date(d.ts).toLocaleTimeString() }));

  return (
    <div style={{width:'100%', height:'100%'}}>
      {plot ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{fontSize:11}} />
            <YAxis domain={['auto','auto']} />
            <Tooltip />
            <Line type="monotone" dataKey="temperature" stroke="#3b82f6" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div>Chart only available for temperature sensors.</div>
      )}
    </div>
  );
}
