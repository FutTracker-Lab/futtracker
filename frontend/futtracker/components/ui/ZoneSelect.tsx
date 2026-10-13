import ComboSelect from "@/components/ui/ComboSelect";
import type { ZoneGroup } from "@/lib/format/zones";

type Props = {
  groups: ZoneGroup[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  error?: string;
};

export default function ZoneSelect({
  groups,
  value,
  onValueChange,
  placeholder,
  hint,
  error,
}: Props) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-900">Zona</span>
        <p role="alert" className="text-sm text-red-700">
          No pudimos cargar las zonas. Recargá la página.
        </p>
      </div>
    );
  }

  return (
    <ComboSelect
      id="zone_id"
      name="zone_id"
      label="Zona"
      groups={groups}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      hint={hint}
      error={error}
      visibleRows={8}
    />
  );
}
