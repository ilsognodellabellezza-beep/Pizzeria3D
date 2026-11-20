"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";
import { Circle, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { saveZone } from "@/app/admin/actions";
import { SITE } from "@/lib/site";
import type { DeliveryZone } from "@/lib/types";
import { adminInput, PrimaryButton, SecondaryButton } from "./ui";

type Point = [number, number]; // [lng, lat]
type ZoneInput = Parameters<typeof saveZone>[0];

const CATANIA: [number, number] = [37.5079, 15.083];
const COLORS = ["#2f855a", "#2b6cb0", "#b7791f", "#805ad5", "#c05621"];

const shopIcon = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#d91f27;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});
const vertexIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #1c1a19;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickToAdd({ onAdd }: { onAdd: (p: Point) => void }) {
  useMapEvents({ click: (e) => onAdd([Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6))]) });
  return null;
}

const toLatLng = (pts: Point[]): [number, number][] => pts.map(([lng, lat]) => [lat, lng]);

/**
 * Mappa di Catania per delimitare dove si consegna: le aree colorate sono servite,
 * tutto il resto no. Si disegna cliccando sulla mappa; i punti si possono trascinare.
 */
export default function ZoneMapEditor({ zones, onSave }: { zones: DeliveryZone[]; onSave: (z: ZoneInput) => void }) {
  const [selected, setSelected] = useState<string>(zones[0]?.id ?? "new");
  const [name, setName] = useState("");
  const [points, setPoints] = useState<Point[]>(zones[0]?.polygon ?? []);
  const current = zones.find((z) => z.id === selected) ?? null;

  const select = (id: string) => {
    setSelected(id);
    setPoints(zones.find((z) => z.id === id)?.polygon ?? []);
    setName("");
  };

  const canSave = points.length >= 3 && (current ? true : name.trim().length > 0);
  const save = () =>
    onSave({
      id: current?.id,
      name: current?.name ?? name.trim(),
      description: current?.description ?? null,
      radius_km: null, // il poligono sostituisce il raggio
      polygon: points,
      fee: current ? Number(current.fee) : 0,
      min_order: current ? Number(current.min_order) : 0,
      free_over: current?.free_over != null ? Number(current.free_over) : null,
      is_active: current?.is_active ?? true,
      position: current?.position ?? zones.length + 1,
    });

  return (
    <div>
      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
        <label className="text-sm font-medium">
          Zona da disegnare
          <select className={`${adminInput} mt-1`} value={selected} onChange={(e) => select(e.target.value)}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            <option value="new">+ Nuova zona</option>
          </select>
        </label>
        {!current && (
          <label className="text-sm font-medium">
            Nome nuova zona
            <input className={`${adminInput} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Centro" />
          </label>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-lava/10">
        <MapContainer center={CATANIA} zoom={12} scrollWheelZoom className="z-0 h-[420px] w-full sm:h-[520px]">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickToAdd onAdd={(p) => setPoints((prev) => [...prev, p])} />

          {zones.map((z, i) => {
            if (z.id === selected) return null; // la zona in modifica è mostrata dalla bozza
            const color = COLORS[i % COLORS.length];
            const opts = { color, fillColor: color, fillOpacity: z.is_active ? 0.22 : 0.06, weight: 2, dashArray: z.is_active ? undefined : "6" };
            if (z.polygon && z.polygon.length >= 3)
              return <Polygon key={z.id} positions={toLatLng(z.polygon)} pathOptions={opts}><Tooltip sticky>{z.name}</Tooltip></Polygon>;
            if (z.radius_km != null)
              return <Circle key={z.id} center={[SITE.geo.lat, SITE.geo.lng]} radius={Number(z.radius_km) * 1000} pathOptions={opts}><Tooltip sticky>{z.name} · {z.radius_km} km</Tooltip></Circle>;
            return null;
          })}

          {points.length >= 3 && <Polygon positions={toLatLng(points)} pathOptions={{ color: "#d91f27", fillColor: "#d91f27", fillOpacity: 0.25, weight: 3 }} />}
          {points.map((p, i) => (
            <Marker
              key={`${i}-${p[0]}-${p[1]}`}
              position={[p[1], p[0]]}
              icon={vertexIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  setPoints((prev) => prev.map((q, j) => (j === i ? [Number(ll.lng.toFixed(6)), Number(ll.lat.toFixed(6))] : q)));
                },
              }}
            />
          ))}
          <Marker position={[SITE.geo.lat, SITE.geo.lng]} icon={shopIcon}><Tooltip>{SITE.name}</Tooltip></Marker>
        </MapContainer>
      </div>

      <p className="mt-3 text-sm text-pietra">
        Clicca sulla mappa per tracciare i vertici dell&apos;area (almeno 3), trascinali per aggiustarli. Le aree colorate sono quelle dove consegni: gli indirizzi fuori da tutte le aree attive vengono rifiutati al checkout.
        {current && current.radius_km != null && !current.polygon && " Questa zona usa un raggio: salvando il disegno lo sostituisci."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SecondaryButton disabled={points.length === 0} onClick={() => setPoints((p) => p.slice(0, -1))}>Annulla ultimo punto</SecondaryButton>
        <SecondaryButton disabled={points.length === 0} onClick={() => setPoints([])}>Cancella disegno</SecondaryButton>
        <span className="text-sm text-pietra">{points.length} punti</span>
        <span className="flex-1" />
        <PrimaryButton disabled={!canSave} onClick={save}>Salva area</PrimaryButton>
      </div>
    </div>
  );
}
