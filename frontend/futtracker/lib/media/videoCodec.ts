// El contenedor y el códec de video de un archivo, leídos de su encabezado y
// sin decodificar nada (FUT-163). El MIME no alcanza: un `.mov` de iPhone es
// `video/quicktime` tanto en H.264 como en HEVC.
//
// Es validación de cliente para que el clip se vea en cualquier dispositivo,
// no de seguridad: si no puede leer el archivo devuelve `null` y el archivo
// pasa. El porqué de qué se acepta está en docs/highlights-video.md.

// MOV y MP4 comparten estructura (ISO BMFF / QuickTime): los dos son "mp4".
export type VideoContainer = "mp4" | "webm";
export type VideoCodec = "h264" | "hevc" | "vp8" | "vp9" | "av1" | "other";
export type VideoFormat = { container: VideoContainer; codec: VideoCodec };

export function isPlayableEverywhere(format: VideoFormat | null): boolean {
  if (format === null) {
    return true;
  }

  return format.container === "mp4"
    ? format.codec === "h264"
    : format.codec === "vp8" || format.codec === "vp9";
}

export async function readVideoFormat(file: Blob): Promise<VideoFormat | null> {
  try {
    const magic = await readBytes(file, 0, 4);

    if (magic.length < 4) {
      return null;
    }

    return isEbml(magic) ? await readWebm(file) : await readIso(file);
  } catch {
    return null;
  }
}

async function readBytes(file: Blob, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

function fourcc(data: Uint8Array, offset: number): string {
  return String.fromCharCode(...data.subarray(offset, offset + 4));
}

// --- WebM (Matroska) ---------------------------------------------------------

function isEbml(magic: Uint8Array): boolean {
  return magic[0] === 0x1a && magic[1] === 0x45 && magic[2] === 0xdf && magic[3] === 0xa3;
}

// La pista de video va en `Tracks`, al principio del archivo. En vez de
// recorrer todo el árbol EBML, busca el elemento CodecID (ID 0x86) y lee su
// texto con el tamaño que declara: así el elemento siguiente no se pega al
// nombre. Un clip de cámara o de grabación de pantalla tiene una sola pista de
// video, así que alcanza con el primer CodecID que empiece con "V_".
const WEBM_SCAN_BYTES = 1024 * 1024;
const WEBM_CODEC_ID_ELEMENT = 0x86;
const WEBM_MAX_CODEC_ID_LENGTH = 64;
const WEBM_CODECS: Record<string, VideoCodec> = {
  V_VP8: "vp8",
  V_VP9: "vp9",
  V_AV1: "av1",
  "V_MPEG4/ISO/AVC": "h264",
  "V_MPEGH/ISO/HEVC": "hevc",
};

// Un entero de largo variable de EBML: la cantidad de ceros a la izquierda del
// primer byte dice cuántos bytes ocupa, y ese bit marcador no es parte del
// valor.
function readVint(data: Uint8Array, offset: number): { value: number; length: number } | null {
  const first = data[offset];

  if (first === undefined || first === 0) {
    return null;
  }

  const length = Math.clz32(first) - 23;

  if (offset + length > data.length) {
    return null;
  }

  let value = first & (0xff >> length);
  for (let i = 1; i < length; i++) {
    value = value * 256 + data[offset + i];
  }

  return { value, length };
}

function videoCodecIdIn(data: Uint8Array): string | null {
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== WEBM_CODEC_ID_ELEMENT) {
      continue;
    }

    const size = readVint(data, i + 1);

    if (!size || size.value < 2 || size.value > WEBM_MAX_CODEC_ID_LENGTH) {
      continue;
    }

    const start = i + 1 + size.length;
    const end = start + size.value;

    if (end > data.length) {
      continue;
    }

    // Los textos de EBML pueden venir rellenos con ceros al final.
    const codecId = String.fromCharCode(...data.subarray(start, end)).replace(/\0+$/, "");

    if (/^V_[\x20-\x7e]+$/.test(codecId)) {
      return codecId;
    }
  }

  return null;
}

async function readWebm(file: Blob): Promise<VideoFormat | null> {
  const codecId = videoCodecIdIn(await readBytes(file, 0, WEBM_SCAN_BYTES));

  return codecId ? { container: "webm", codec: WEBM_CODECS[codecId] ?? "other" } : null;
}

// --- MP4 / MOV ---------------------------------------------------------------

// Un `moov` de un clip de 2 minutos ocupa decenas o cientos de KB; uno de más
// de 4 MB es un archivo raro y no vale la pena cargarlo en memoria.
const MAX_MOOV_BYTES = 4 * 1024 * 1024;
const MAX_TOP_LEVEL_BOXES = 64;

const ISO_CODECS: Record<string, VideoCodec> = {
  avc1: "h264",
  avc3: "h264",
  hvc1: "hevc",
  hev1: "hevc",
  // Dolby Vision sobre HEVC: lo que graba un iPhone con HDR.
  dvh1: "hevc",
  dvhe: "hevc",
  av01: "av1",
  vp08: "vp8",
  vp09: "vp9",
};

type Box = { type: string; size: number; headerSize: number };

// El encabezado de una caja en `data[offset]`, si entra en `available` bytes.
// Tamaño 1: el real va en los 8 bytes siguientes. Tamaño 0: llega hasta el
// final del archivo o de la caja que la contiene.
function readBox(data: Uint8Array, offset: number, available: number): Box | null {
  if (available < 8 || data.length - offset < 8) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset + offset);
  let size = view.getUint32(0);
  let headerSize = 8;

  if (size === 1) {
    if (available < 16 || data.length - offset < 16) {
      return null;
    }
    size = Number(view.getBigUint64(8));
    headerSize = 16;
  } else if (size === 0) {
    size = available;
  }

  if (size < headerSize || size > available) {
    return null;
  }

  return { type: fourcc(data, offset + 4), size, headerSize };
}

// Recorre solo los encabezados del nivel superior y se saltea el `mdat` sin
// leerlo: en los videos de iPhone el `moov` va al final, después de los MB de
// imagen.
async function readIso(file: Blob): Promise<VideoFormat | null> {
  let offset = 0;

  for (let i = 0; i < MAX_TOP_LEVEL_BOXES && offset < file.size; i++) {
    const header = await readBytes(file, offset, offset + 16);
    const box = readBox(header, 0, file.size - offset);

    if (!box || !/^[\x20-\x7e]{4}$/.test(box.type)) {
      return null;
    }

    if (box.type === "moov") {
      if (box.size > MAX_MOOV_BYTES) {
        return null;
      }
      const moov = await readBytes(file, offset, offset + box.size);
      const codec = videoCodecInMoov(moov, box.headerSize);
      return codec ? { container: "mp4", codec } : null;
    }

    offset += box.size;
  }

  return null;
}

type Range = { start: number; end: number };

function* boxesIn(data: Uint8Array, { start, end }: Range) {
  let offset = start;

  while (offset < end) {
    const box = readBox(data, offset, end - offset);

    if (!box) {
      return;
    }

    yield { type: box.type, start: offset + box.headerSize, end: offset + box.size };
    offset += box.size;
  }
}

function findBox(data: Uint8Array, range: Range | null, type: string): Range | null {
  if (!range) {
    return null;
  }

  for (const box of boxesIn(data, range)) {
    if (box.type === type) {
      return box;
    }
  }

  return null;
}

// moov → trak → mdia: `hdlr` dice si la pista es de video, y
// minf → stbl → stsd tiene la primera entrada, cuyo tipo es el códec.
function videoCodecInMoov(moov: Uint8Array, headerSize: number): VideoCodec | null {
  for (const trak of boxesIn(moov, { start: headerSize, end: moov.length })) {
    if (trak.type !== "trak") {
      continue;
    }

    const mdia = findBox(moov, trak, "mdia");
    const hdlr = findBox(moov, mdia, "hdlr");
    const stsd = findBox(moov, findBox(moov, findBox(moov, mdia, "minf"), "stbl"), "stsd");

    // hdlr: versión y flags (4), pre_defined (4) y el tipo de pista.
    // stsd: versión y flags (4), cantidad de entradas (4) y la primera entrada.
    if (
      !hdlr ||
      !stsd ||
      hdlr.end - hdlr.start < 12 ||
      stsd.end - stsd.start < 16 ||
      fourcc(moov, hdlr.start + 8) !== "vide"
    ) {
      continue;
    }

    return ISO_CODECS[fourcc(moov, stsd.start + 12)] ?? "other";
  }

  return null;
}
