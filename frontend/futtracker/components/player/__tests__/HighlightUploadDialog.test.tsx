// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HighlightUploadDialog from "@/components/player/HighlightUploadDialog";
import {
  byText,
  cleanup,
  click,
  flush,
  render,
} from "@/components/player/__tests__/dialogTestUtils";
import { HIGHLIGHT_ERRORS } from "@/lib/data/highlightErrors";

const addHighlightMock = vi.fn();
const uploadMock = vi.fn();
const removeMock = vi.fn();
const readVideoDurationMock = vi.fn();
const onClose = vi.fn();

vi.mock("@/app/jugadores/[id]/highlights-actions", () => ({
  addHighlight: (...args: unknown[]) => addHighlightMock(...args),
  removeHighlight: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ upload: uploadMock, remove: removeMock }) },
  }),
}));

vi.mock("@/components/player/videoDuration", () => ({
  readVideoDuration: (...args: unknown[]) => readVideoDurationMock(...args),
}));

const PLAYER_ID = "11111111-1111-4111-8111-111111111111";
const MB = 1024 * 1024;

function videoFile(type: string, sizeMb: number, name = "clip.mp4") {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: sizeMb * MB });
  return file;
}

async function pickFile(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
}

function typeTitle(value: string) {
  const input = document.querySelector<HTMLInputElement>('input:not([type="file"])')!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit() {
  click(byText("Subir")!);
  await flush();
}

function alerts() {
  return Array.from(document.querySelectorAll('[role="alert"]')).map((el) => el.textContent);
}

beforeEach(() => {
  readVideoDurationMock.mockResolvedValue(90);
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockResolvedValue({ error: null });
  addHighlightMock.mockResolvedValue({ ok: true });
  render(<HighlightUploadDialog open onClose={onClose} playerId={PLAYER_ID} />);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HighlightUploadDialog", () => {
  it("sube un MP4 válido a la carpeta del jugador y da de alta la fila", async () => {
    await pickFile(videoFile("video/mp4", 30));
    typeTitle("Gol vs Racing");
    await submit();

    const [path, , options] = uploadMock.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${PLAYER_ID}/[0-9a-f-]{36}\\.mp4$`));
    expect(options).toEqual({ contentType: "video/mp4" });
    expect(addHighlightMock).toHaveBeenCalledWith({ title: "Gol vs Racing", storage_path: path });
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ["un MP4 de 60 MB", videoFile("video/mp4", 60), 90, "Gol", "El video pesa más de 50 MB. Comprimilo e intentá de nuevo."],
    ["un video de 130 segundos", videoFile("video/mp4", 30), 130, "Gol", "El video dura más de 2 minutos."],
    ["un PDF", videoFile("application/pdf", 1, "cv.pdf"), 90, "Gol", "Formato no permitido. Subí un video MP4, WebM o MOV."],
    ["un título vacío", videoFile("video/mp4", 30), 90, "", "Ingresá un título."],
    ["un título de 81 caracteres", videoFile("video/mp4", 30), 90, "x".repeat(81), "El título no puede superar los 80 caracteres."],
    ["ningún video elegido", null, 90, "Gol", "Elegí un video."],
  ])("rechaza %s sin pedir nada al storage", async (_, file, seconds, title, message) => {
    readVideoDurationMock.mockResolvedValue(seconds);

    if (file) await pickFile(file);
    if (title) typeTitle(title);
    await submit();

    expect(alerts()).toContain(message);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("deja subir si el navegador no pudo leer la duración", async () => {
    readVideoDurationMock.mockResolvedValue(null);

    await pickFile(videoFile("video/quicktime", 30, "clip.MOV"));
    typeTitle("Gol");
    await submit();

    expect(uploadMock).toHaveBeenCalled();
  });

  it("cambiar de archivo mientras se lee la duración no deja Subir trabado", async () => {
    readVideoDurationMock.mockReturnValueOnce(new Promise(() => {}));

    await pickFile(videoFile("video/mp4", 30));
    expect((byText("Subir") as HTMLButtonElement).disabled).toBe(true);

    await pickFile(videoFile("application/pdf", 1, "cv.pdf"));
    expect((byText("Subir") as HTMLButtonElement).disabled).toBe(false);
  });

  it("mientras sube muestra Subiendo… y deshabilita el botón", async () => {
    uploadMock.mockReturnValue(new Promise(() => {}));

    await pickFile(videoFile("video/mp4", 30));
    typeTitle("Gol");
    await submit();

    expect(byText("Subiendo…")).toBeDefined();
    expect((byText("Subir") as HTMLButtonElement).disabled).toBe(true);
    expect((byText("Cancelar") as HTMLButtonElement).disabled).toBe(true);
  });

  it("si el servidor rechaza por el límite, avisa y borra el objeto subido", async () => {
    addHighlightMock.mockResolvedValue({ ok: false, error: HIGHLIGHT_ERRORS.limitReached });

    await pickFile(videoFile("video/mp4", 30));
    typeTitle("Gol");
    await submit();

    const [path] = uploadMock.mock.calls[0];
    expect(alerts()).toContain(HIGHLIGHT_ERRORS.limitReached);
    expect(removeMock).toHaveBeenCalledWith([path]);
    expect(onClose).not.toHaveBeenCalled();
  });
});
