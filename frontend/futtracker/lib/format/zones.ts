import type { Zone } from "@/lib/data/zones";

// `listZones` ordena por provincia y "Buenos Aires" saldría antes que CABA.
const GROUPS = [
  { province: "CABA", label: "CABA" },
  { province: "Buenos Aires", label: "Gran Buenos Aires" },
];

export type ZoneGroup = {
  label: string;
  options: { value: string; label: string }[];
};

export function zoneGroupsFrom(zones: Zone[]): ZoneGroup[] {
  return GROUPS.map(({ province, label }) => ({
    label,
    options: zones
      .filter((zone) => zone.province === province)
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((zone) => ({ value: zone.id, label: zone.name })),
  })).filter((group) => group.options.length > 0);
}

// Una zona desactivada no está en `zones`: cuenta como sin zona.
export function isListedZone(zoneId: string | null | undefined, zones: Zone[]) {
  return zones.some((zone) => zone.id === zoneId);
}

type LocationRow = {
  zone_id: string | null;
  city: string | null;
  province: string | null;
};

export function previousLocationHint(row: LocationRow | null, zones: Zone[]): string | null {
  if (!row?.city || isListedZone(row.zone_id, zones)) {
    return null;
  }

  const place = row.province ? `${row.city}, ${row.province}` : row.city;

  return `Antes cargaste: ${place}. Elegí la zona más cercana.`;
}
