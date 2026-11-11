# Highlights: compatibilidad de video en celulares

Por qué los clips de highlights se limitan a ciertos formatos y qué cuesta esa
decisión (FUT-163).

## El problema

La extensión y el MIME no dicen cómo está comprimido el video. Un `.MOV` de
iPhone es `video/quicktime` tanto si viene en H.264 como en HEVC (H.265), y
desde el iPhone 7 la cámara graba en HEVC por defecto ("Alta eficiencia").

HEVC se ve en Safari, pero no en todos lados ([caniuse: HEVC](https://caniuse.com/hevc)):

| Navegador | HEVC |
|---|---|
| Safari iOS / macOS | sí |
| Chrome Android | solo si el celular lo decodifica por hardware |
| Chrome escritorio (107+) | solo con decodificación por hardware |
| Firefox escritorio (137+) | parcial |

Cuando no puede, el navegador falla con un error o, según el caso, carga el
archivo y reproduce solo el audio con la imagen en negro.

H.264 en MP4 se ve en todos. WebM (VP8/VP9) se ve en Safari de iPhone desde
iOS 17.4; antes, el soporte era parcial ([caniuse: WebM](https://caniuse.com/webm)).

## La decisión: aceptar solo formatos que se ven en todos lados

| Contenedor | Códec | ¿Se acepta? |
|---|---|---|
| MP4 o MOV | H.264 | sí |
| WebM | VP8 o VP9 | sí |
| MP4 o MOV | HEVC, AV1, VP9, ProRes u otro | no |
| WebM | AV1, H.264, HEVC u otro | no |
| No se pudo leer | — | sí (validación de cliente, no de seguridad) |

**Cómo funciona.** Al elegir el archivo, `lib/media/videoCodec.ts` lee el
encabezado sin decodificar nada: en MP4/MOV, la caja `moov` (el índice, de
decenas o cientos de KB) hasta la entrada de `stsd` de la pista de video; en
WebM, el `CodecID` del primer MB. Los datos de imagen (`mdat`) los saltea, así
que encuentra el `moov` aunque esté al final del archivo, como en los videos de
iPhone. Si el formato no sirve, el diálogo dice cuáles sirven y cómo poner la
cámara del iPhone en "Más compatible".

**El visor no queda en negro.** Para los clips que ya se subieron, o los que
lleguen por otro camino, `HighlightViewer` muestra "Este clip no se puede
reproducir en este dispositivo" ante un error de decodificación o una pista de
video sin imagen. Un error de red muestra "No pudimos cargar este clip".

### Por qué no recodificar

Recodificar a H.264 resolvería el problema sin pedirle nada al jugador, pero
hoy no hay dónde hacerlo sin agregar infraestructura:

| Dónde | Costo |
|---|---|
| Edge Function de Supabase | Corre en Deno: no puede ejecutar binarios nativos como `ffmpeg`, y tiene límites de CPU por request. |
| Función de Vercel | El body de un request se limita a 4,5 MB, así que habría que bajar el clip desde Storage. Además, empaquetar `ffmpeg` en la función y pagar la CPU y la memoria de recodificar hasta 2 minutos por clip. |
| Servicio externo (Mux, Cloudinary) | Una cuenta nueva, un costo por minuto procesado y un webhook para enterarse cuando termina. |
| En el navegador (`ffmpeg.wasm`) | Unos 30 MB de descarga y minutos de CPU en un celular para un clip de 2 minutos. |

### El costo de esta decisión

- **Desde Safari de iPhone, el filtro no molesta.** Al elegir un video HEVC de
  la fototeca, iOS lo entrega convertido a H.264 y en la misma resolución (ver
  las pruebas en dispositivos). El rechazo le llega a quien sube un HEVC desde
  una computadora, por ejemplo un video pasado del iPhone por AirDrop o cable.
  El mensaje le dice cómo grabar en un formato compatible, en cualquier
  celular y con el camino exacto en iPhone.
- **Grabar desde el diálogo de subida en un iPhone da un video de 480×360.**
  Es lo que hace Safari cuando graba directo desde un formulario, no algo que
  cambie este filtro. Para un highlight conviene grabar con la app Cámara y
  después elegirlo de la fototeca.
- **Un iPhone con iOS anterior a 17.4 puede no reproducir un WebM.** Se acepta
  igual porque WebM es lo que generan la grabación de pantalla y muchas apps de
  Android, y esos iPhones son cada vez menos; si alguno no puede, ve el
  mensaje del visor en vez de una pantalla en negro.
- **La validación es solo de cliente.** Quien suba directo a Storage puede
  saltearla; para eso está el mensaje del visor. No es un riesgo de seguridad:
  el bucket ya limita el tamaño y el tipo declarado.

Si el equipo decide recodificar más adelante, el detector sirve para saber qué
clips hace falta procesar.

## Pruebas

### Navegador de escritorio (hecho)

Chrome 152 en Windows. Videos reales de 320×240 grabados con `MediaRecorder`
y elegidos en el diálogo de subida. `MediaRecorder` genera MP4 con el `moov` al
principio; los `.MOV` son esos mismos MP4 con otro nombre y otro MIME. El caso
del `moov` al final está cubierto por los tests unitarios.

| Archivo | Contenedor y códec | Resultado |
|---|---|---|
| `clip.mp4` | MP4, H.264 | se acepta, se sube y se reproduce |
| `IMG_0001.MOV` | MP4, H.264 | se acepta |
| `IMG_0002.MOV` | MP4, HEVC | se rechaza con el mensaje |
| `clip.mp4` | MP4, HEVC | se rechaza |
| `clip.mp4` | MP4, AV1 | se rechaza |
| `clip.mp4` | MP4, VP9 | se rechaza |
| `clip.webm` | WebM, VP8 | se acepta |
| `clip.webm` | WebM, VP9 | se acepta |
| `clip.webm` | WebM, AV1 | se rechaza |
| `clip.webm` | WebM, H.264 | se rechaza |
| `cv.pdf` | — | se rechaza por el MIME, con el mismo texto de formatos |
| `roto.mp4` (bytes al azar) | ilegible | se acepta; el visor muestra "no se puede reproducir" en vez de negro |

### Dispositivos reales

iPhone con Safari, subiendo a `futtracker-dev` (que todavía no tiene el
filtro, así que todo lo que llega a Storage es lo que manda el iPhone). El
formato se leyó del encabezado de cada archivo en Storage.

| Clip | Cómo se eligió | Formato que llegó a Storage | Sube | Se ve en iPhone | Se ve en Chrome de PC | Se ve en Android |
|---|---|---|---|---|---|---|
| App Cámara en "Más compatible" | fototeca | MOV, H.264, 1920×1080, 43 MB, original de la cámara (`moov` al final) | sí | sí | sí | sin probar |
| App Cámara en "Alta eficiencia" | fototeca | MOV, H.264, 1920×1080, 7 MB: iOS lo convirtió de HEVC (`moov` al principio, exportado) | sí | sí | sí | sin probar |
| Grabado desde el diálogo, en "Alta eficiencia" | "Grabar video" del selector | MOV, H.264, **480×360** | sí | sí | sí | sin probar |
| Cámara de Android | Chrome | sin probar | | | | |

**Android quedó sin probar.** No hubo un Android a mano, y el equipo decidió
mergear sin esa prueba (2026-11-11). Los tres clips llegaron en H.264, que
Chrome de Android reproduce siempre, así que lo esperable es que se vean. Lo
que no se sabe es qué formato manda la cámara de cada Android: algunos (Samsung,
por ejemplo) graban en HEVC, y a esos el filtro los rechaza con el mensaje que
dice cómo elegir H.264 en la cámara.

La fila de "Alta eficiencia" es la que decidía cuánto molesta la restricción:
como iOS convierte el video al elegirlo, el jugador de iPhone que sube desde
Safari nunca ve el error.
