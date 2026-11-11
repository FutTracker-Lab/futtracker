import { describe, expect, it } from "vitest";

import { isPlayableEverywhere, readVideoFormat } from "@/lib/media/videoCodec";

type Bytes = Uint8Array<ArrayBuffer>;

// Arma cajas ISO BMFF (MP4/MOV) a mano: 4 bytes de tamaño, 4 de tipo y el
// contenido. Alcanza para lo que mira el detector: `hdlr` y `stsd`.
function box(type: string, ...children: Bytes[]): Bytes {
  const body = concat(children);
  const out = new Uint8Array(8 + body.length);
  new DataView(out.buffer).setUint32(0, out.length);
  out.set(ascii(type), 4);
  out.set(body, 8);
  return out;
}

function ascii(text: string): Bytes {
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

function concat(parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// Full box: versión y flags antes del contenido.
const FULL_BOX_HEADER = new Uint8Array(4);

function hdlr(handler: string) {
  return box("hdlr", FULL_BOX_HEADER, new Uint8Array(4), ascii(handler), new Uint8Array(12));
}

function stsd(sampleEntry: string) {
  const entryCount = new Uint8Array([0, 0, 0, 1]);
  return box("stsd", FULL_BOX_HEADER, entryCount, box(sampleEntry, new Uint8Array(78)));
}

function track(handler: string, sampleEntry: string) {
  return box("trak", box("mdia", hdlr(handler), box("minf", box("stbl", stsd(sampleEntry)))));
}

function isoFile(...topLevel: Bytes[]): Blob {
  return new Blob([box("ftyp", ascii("isom"), new Uint8Array(4)), ...topLevel]);
}

// El CodecID como elemento EBML: ID 0x86, el tamaño como vint de un byte
// (0x80 | largo) y el texto. `after` son los bytes que siguen en el archivo.
function webmFile(codecId: string, after: Bytes = new Uint8Array(40)): Blob {
  const ebmlMagic = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
  const element = concat([new Uint8Array([0x86, 0x80 | codecId.length]), ascii(codecId)]);
  return new Blob([ebmlMagic, new Uint8Array(40), element, after]);
}

// Los datos de imagen: el detector tiene que saltearlos para llegar al `moov`.
const mdat = box("mdat", new Uint8Array(1024));

describe("readVideoFormat: MP4 y MOV", () => {
  it.each([
    ["avc1", "h264"],
    ["avc3", "h264"],
    ["hvc1", "hevc"],
    ["hev1", "hevc"],
    ["dvh1", "hevc"],
    ["av01", "av1"],
    ["vp09", "vp9"],
    // ProRes, de los iPhone Pro.
    ["apch", "other"],
    ["mp4v", "other"],
  ] as const)("con %s es %s", async (sampleEntry, codec) => {
    const file = isoFile(box("moov", track("vide", sampleEntry)), mdat);

    expect(await readVideoFormat(file)).toEqual({ container: "mp4", codec });
  });

  it("encuentra el moov aunque esté después del mdat, como en los videos de iPhone", async () => {
    const file = isoFile(mdat, box("moov", track("vide", "hvc1")));

    expect(await readVideoFormat(file)).toEqual({ container: "mp4", codec: "hevc" });
  });

  it("toma el códec de la pista de video y no el del audio", async () => {
    const file = isoFile(box("moov", track("soun", "mp4a"), track("vide", "avc1")));

    expect(await readVideoFormat(file)).toEqual({ container: "mp4", codec: "h264" });
  });

  it("si una pista de video está incompleta, sigue con la siguiente", async () => {
    const incomplete = box("trak", box("mdia", hdlr("vide")));
    const file = isoFile(box("moov", incomplete, track("vide", "hvc1")));

    expect(await readVideoFormat(file)).toEqual({ container: "mp4", codec: "hevc" });
  });

  it("lee cajas con tamaño de 64 bits", async () => {
    const large = new Uint8Array(16 + 8);
    const view = new DataView(large.buffer);
    view.setUint32(0, 1);
    large.set(ascii("mdat"), 4);
    view.setBigUint64(8, BigInt(large.length));
    const file = isoFile(large, box("moov", track("vide", "avc1")));

    expect(await readVideoFormat(file)).toEqual({ container: "mp4", codec: "h264" });
  });

  it("lee un moov con tamaño 0, que llega hasta el final del archivo", async () => {
    const moov = box("moov", track("vide", "avc1"));
    new DataView(moov.buffer).setUint32(0, 0);

    expect(await readVideoFormat(isoFile(moov))).toEqual({ container: "mp4", codec: "h264" });
  });

  it.each([
    ["sin moov", isoFile(mdat)],
    ["con el moov cortado", new Blob([isoFile(box("moov", track("vide", "avc1"))).slice(0, 60)])],
    ["sin pista de video", isoFile(box("moov", track("soun", "mp4a")))],
  ])("%s no se puede leer", async (_, file) => {
    expect(await readVideoFormat(file)).toBeNull();
  });

  it("un moov de más de 4 MB no se carga en memoria", async () => {
    const huge = box("moov", track("vide", "hvc1"), box("free", new Uint8Array(4 * 1024 * 1024)));

    expect(await readVideoFormat(isoFile(huge))).toBeNull();
  });

  it("una caja con tamaño imposible no lo cuelga ni lo rompe", async () => {
    const broken = new Uint8Array(8);
    new DataView(broken.buffer).setUint32(0, 3);
    broken.set(ascii("free"), 4);

    expect(await readVideoFormat(isoFile(broken))).toBeNull();
  });
});

describe("readVideoFormat: WebM", () => {
  it.each([
    ["V_VP8", "vp8"],
    ["V_VP9", "vp9"],
    ["V_AV1", "av1"],
    ["V_MPEG4/ISO/AVC", "h264"],
    ["V_MPEGH/ISO/HEVC", "hevc"],
    ["V_THEORA", "other"],
  ] as const)("con %s es %s", async (codecId, codec) => {
    expect(await readVideoFormat(webmFile(codecId))).toEqual({ container: "webm", codec });
  });

  // Revisión de la #66: buscando el texto con una regex, el ID del elemento
  // siguiente se pegaba al nombre. FlagForced (0x55AA) y Name (0x536E)
  // empiezan con "U" y "S", así que "V_VP9" se leía "V_VP9U" y se rechazaba.
  it.each([
    ["FlagForced", [0x55, 0xaa, 0x81, 0x00]],
    ["Name", [0x53, 0x6e, 0x82, 0x41, 0x42]],
  ])("lee el códec aunque después venga %s", async (_, bytes) => {
    const file = webmFile("V_VP9", Uint8Array.from(bytes));

    expect(await readVideoFormat(file)).toEqual({ container: "webm", codec: "vp9" });
  });

  it("ignora el relleno con ceros al final del CodecID", async () => {
    expect(await readVideoFormat(webmFile("V_VP9\0\0"))).toEqual({
      container: "webm",
      codec: "vp9",
    });
  });

  it("un V_ suelto fuera de un CodecID no cuenta", async () => {
    const ebmlMagic = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
    const file = new Blob([ebmlMagic, ascii("V_VP9 en un título"), new Uint8Array(40)]);

    expect(await readVideoFormat(file)).toBeNull();
  });

  it("sin CodecID de video no se puede leer", async () => {
    expect(await readVideoFormat(webmFile("A_OPUS"))).toBeNull();
  });
});

describe("readVideoFormat: otros archivos", () => {
  it("un archivo que no es video no se puede leer", async () => {
    expect(await readVideoFormat(new Blob(["no soy un video"]))).toBeNull();
    expect(await readVideoFormat(new Blob([]))).toBeNull();
  });
});

describe("isPlayableEverywhere", () => {
  it.each([
    [{ container: "mp4", codec: "h264" }],
    [{ container: "webm", codec: "vp8" }],
    [{ container: "webm", codec: "vp9" }],
    // Si no se pudo leer, pasa: es validación de cliente, no de seguridad.
    [null],
  ] as const)("acepta %j", (format) => {
    expect(isPlayableEverywhere(format)).toBe(true);
  });

  it.each([
    [{ container: "mp4", codec: "hevc" }],
    [{ container: "mp4", codec: "av1" }],
    [{ container: "mp4", codec: "other" }],
    // Safari no reproduce VP9 dentro de MP4 ni H.264 dentro de WebM.
    [{ container: "mp4", codec: "vp9" }],
    [{ container: "webm", codec: "h264" }],
    [{ container: "webm", codec: "av1" }],
    [{ container: "webm", codec: "other" }],
  ] as const)("rechaza %j", (format) => {
    expect(isPlayableEverywhere(format)).toBe(false);
  });
});
