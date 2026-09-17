import Card from "@/components/ui/Card";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import { POSITIONS, PREFERRED_FEET } from "@/lib/data/players";
import { POSITION_LABELS, PREFERRED_FOOT_LABELS } from "@/lib/format/playerLabels";
import type { PlayerFormErrors, PlayerFormValues } from "./playerFormValues";

const POSITION_OPTIONS = POSITIONS.map((position) => ({
  value: position,
  label: POSITION_LABELS[position],
}));

const PREFERRED_FOOT_OPTIONS = PREFERRED_FEET.map((foot) => ({
  value: foot,
  label: PREFERRED_FOOT_LABELS[foot],
}));

type Props = {
  values: PlayerFormValues;
  errors: PlayerFormErrors;
  onChange: <K extends keyof PlayerFormValues>(
    field: K,
    value: PlayerFormValues[K],
  ) => void;
};

export default function PlayStyleSection({ values, errors, onChange }: Props) {
  return (
    <Card title="Cómo jugás">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="position"
            name="position"
            label="Posición"
            options={POSITION_OPTIONS}
            placeholder="—"
            value={values.position}
            onChange={(event) => onChange("position", event.target.value)}
            error={errors.position}
          />
          <SelectField
            id="preferred_foot"
            name="preferred_foot"
            label="Pierna hábil"
            options={PREFERRED_FOOT_OPTIONS}
            placeholder="—"
            value={values.preferredFoot}
            onChange={(event) => onChange("preferredFoot", event.target.value)}
            error={errors.preferred_foot}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="height_cm"
            name="height_cm"
            type="number"
            min={100}
            max={250}
            label="Altura (cm)"
            value={values.heightCm}
            onChange={(event) => onChange("heightCm", event.target.value)}
            error={errors.height_cm}
            optionalHint
          />
          <TextField
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={30}
            max={200}
            label="Peso (kg)"
            value={values.weightKg}
            onChange={(event) => onChange("weightKg", event.target.value)}
            error={errors.weight_kg}
            optionalHint
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className="text-sm font-medium text-zinc-900">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            maxLength={1000}
            rows={4}
            value={values.bio}
            onChange={(event) => onChange("bio", event.target.value)}
            aria-invalid={errors.bio ? true : undefined}
            aria-describedby={errors.bio ? "bio-error" : "bio-hint"}
            className={`rounded-md border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 ${
              errors.bio
                ? "border-red-500 focus-visible:ring-red-500"
                : "border-zinc-300 focus-visible:ring-brand"
            }`}
          />
          {errors.bio ? (
            <span id="bio-error" role="alert" className="text-xs text-red-700">
              {errors.bio}
            </span>
          ) : (
            <span id="bio-hint" className="text-xs text-zinc-500">
              Contá tu nivel real y tu disponibilidad: es lo que evita
              postulaciones que no encajan.
            </span>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-900">
          <input
            type="checkbox"
            name="is_seeking_team"
            checked={values.isSeekingTeam}
            onChange={(event) => onChange("isSeekingTeam", event.target.checked)}
          />
          Busco equipo
        </label>
      </div>
    </Card>
  );
}
