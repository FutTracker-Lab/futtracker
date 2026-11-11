// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import PersonalDataSection from "@/app/jugadores/mi-perfil/editar/PersonalDataSection";
import { initialValuesFrom } from "@/app/jugadores/mi-perfil/editar/playerFormValues";
import { cleanup, render } from "@/components/player/__tests__/dialogTestUtils";

vi.mock("@/components/player/AvatarUploader", () => ({ default: () => null }));

afterEach(cleanup);

describe("PersonalDataSection", () => {
  it("cada campo autocompletable declara su token", () => {
    render(
      <PersonalDataSection
        values={initialValuesFrom("Juan Pérez", null, [])}
        errors={{}}
        onChange={() => {}}
        initialAvatarUrl={null}
        initialAvatarPath={null}
        userId="11111111-1111-4111-8111-111111111111"
        zoneGroups={[]}
        zoneHint=""
      />,
    );

    const autoCompleteOf = (name: string) =>
      document.querySelector(`[name="${name}"]`)?.getAttribute("autocomplete");

    expect(autoCompleteOf("full_name")).toBe("name");
    expect(autoCompleteOf("birth_date")).toBe("bday");
    expect(autoCompleteOf("phone")).toBe("tel");
    expect(autoCompleteOf("country")).toBe("country");
  });
});
