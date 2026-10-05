import AvatarUploader from "@/components/player/AvatarUploader";
import Card from "@/components/ui/Card";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import {
  COUNTRIES,
  type PlayerFormErrors,
  type PlayerFormValues,
} from "./playerFormValues";

type Props = {
  values: PlayerFormValues;
  errors: PlayerFormErrors;
  onChange: <K extends keyof PlayerFormValues>(
    field: K,
    value: PlayerFormValues[K],
  ) => void;
  initialAvatarUrl: string | null;
  initialAvatarPath: string | null;
  userId: string;
};

// Sin "use client": no usa hooks, y al importarlo un Client Component ya
// queda del lado del cliente. Misma convención que TextField y AuthBrandPanel.
export default function PersonalDataSection({
  values,
  errors,
  onChange,
  initialAvatarUrl,
  initialAvatarPath,
  userId,
}: Props) {
  return (
    <Card title="Datos personales">
      <div className="flex flex-col gap-4">
        <AvatarUploader
          userId={userId}
          fullName={values.fullName}
          initialAvatarUrl={initialAvatarUrl}
          initialAvatarPath={initialAvatarPath}
        />

        <TextField
          id="full_name"
          name="full_name"
          type="text"
          label="Nombre y apellido"
          value={values.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          error={errors.full_name}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="birth_date"
            name="birth_date"
            type="date"
            label="Fecha de nacimiento"
            hint="No se muestra: se publica solo la edad."
            value={values.birthDate}
            onChange={(event) => onChange("birthDate", event.target.value)}
            error={errors.birth_date}
            optionalHint
          />
          <TextField
            id="phone"
            name="phone"
            type="tel"
            label="Teléfono"
            value={values.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            error={errors.phone}
            optionalHint
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            id="city"
            name="city"
            type="text"
            label="Ciudad"
            hint="Desde dónde te movés para entrenar."
            value={values.city}
            onChange={(event) => onChange("city", event.target.value)}
            error={errors.city}
          />
          <TextField
            id="province"
            name="province"
            type="text"
            label="Provincia"
            value={values.province}
            onChange={(event) => onChange("province", event.target.value)}
            error={errors.province}
          />
          <SelectField
            id="country"
            name="country"
            label="País"
            options={COUNTRIES}
            value={values.country}
            onChange={(event) => onChange("country", event.target.value)}
            error={errors.country}
          />
        </div>
      </div>
    </Card>
  );
}
