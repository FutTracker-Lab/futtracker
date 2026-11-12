import { describe, expect, it } from "vitest";

import { stripBidiControls } from "@/lib/format/bidi";

describe("stripBidiControls", () => {
  // U+202A a U+202E (embedding y override) y U+2066 a U+2069 (isolates).
  it.each([
    ["U+202A", "\u202A"],
    ["U+202B", "\u202B"],
    ["U+202C", "\u202C"],
    ["U+202D", "\u202D"],
    ["U+202E", "\u202E"],
    ["U+2066", "\u2066"],
    ["U+2067", "\u2067"],
    ["U+2068", "\u2068"],
    ["U+2069", "\u2069"],
  ])("saca %s", (_, control) => {
    expect(stripBidiControls(`Club${control}Pilar`)).toBe("ClubPilar");
  });

  // El U+202E es el que se usa para que "gpj.exe" se lea al revés.
  it("saca varios en el mismo texto", () => {
    expect(stripBidiControls("\u202Eexe.gpj\u202C \u2066Sur\u2069")).toBe("exe.gpj Sur");
  });

  it("deja igual el texto en otros idiomas y los emojis", () => {
    const text = "Ñandú ⚽ עברית 🥅";

    expect(stripBidiControls(text)).toBe(text);
  });
});
