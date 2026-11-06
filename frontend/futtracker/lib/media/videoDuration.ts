const DURATION_TIMEOUT_MS = 5000;

// Null si el navegador no puede leerla (MOV en HEVC en Chrome) o pasa el timeout.
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    const finish = (seconds: number | null) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(seconds);
    };

    const timer = setTimeout(() => finish(null), DURATION_TIMEOUT_MS);

    video.preload = "metadata";
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}
