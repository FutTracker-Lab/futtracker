export const PROFILE_TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "estadisticas", label: "Estadísticas" },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]["id"];

const DEFAULT_PROFILE_TAB: ProfileTabId = "resumen";

function isProfileTabId(value: unknown): value is ProfileTabId {
  return PROFILE_TABS.some((tab) => tab.id === value);
}

// Next entrega `?tab=a&tab=b` como array: cae en Resumen como cualquier valor inválido.
export function resolveProfileTab(
  value: string | string[] | undefined,
): ProfileTabId {
  return isProfileTabId(value) ? value : DEFAULT_PROFILE_TAB;
}
