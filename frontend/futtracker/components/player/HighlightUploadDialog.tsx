"use client";

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { addHighlight } from "@/app/jugadores/[id]/highlights-actions";
import {
  runHighlightUpload,
  validateHighlightDuration,
  validateHighlightFile,
  validateHighlightTitle,
  type HighlightUploadPort,
} from "@/components/player/highlightUpload";
import { readVideoDuration } from "@/components/player/videoDuration";
import Dialog from "@/components/ui/Dialog";
import Spinner from "@/components/ui/Spinner";
import TextField from "@/components/ui/TextField";
import {
  buildHighlightPath,
  HIGHLIGHT_MIME_TYPES,
  HIGHLIGHTS_BUCKET,
} from "@/lib/data/highlights";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  playerId: string;
};

// El formulario solo existe mientras el diálogo está abierto: al cerrar se descarta todo el estado.
export default function HighlightUploadDialog({ open, onClose, playerId }: Props) {
  return open ? <UploadForm onClose={onClose} playerId={playerId} /> : null;
}

function UploadForm({ onClose, playerId }: Omit<Props, "open">) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const latestPick = useRef(0);
  const headingId = useId();
  const fileId = useId();
  const titleFieldId = useId();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    const pick = ++latestPick.current;

    setFile(null);
    setReading(false);
    setFileError(null);
    setSubmitError(null);

    if (!picked) return;

    const typeError = validateHighlightFile(picked);

    if (typeError) {
      setFileError(typeError);
      return;
    }

    setReading(true);
    const durationError = validateHighlightDuration(await readVideoDuration(picked));

    if (pick !== latestPick.current) return;

    setReading(false);

    if (durationError) {
      setFileError(durationError);
    } else {
      setFile(picked);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextFileError = file ? null : (fileError ?? "Elegí un video.");
    const nextTitleError = validateHighlightTitle(title);

    setFileError(nextFileError);
    setTitleError(nextTitleError);

    if (!file || nextTitleError) return;

    setUploading(true);
    setSubmitError(null);

    const storage = createClient().storage.from(HIGHLIGHTS_BUCKET);
    const port: HighlightUploadPort = {
      upload: (path, blob) => storage.upload(path, blob, { contentType: blob.type }),
      remove: (path) => storage.remove([path]),
      persist: addHighlight,
    };

    const result = await runHighlightUpload({
      file,
      title,
      path: buildHighlightPath(playerId, file.name, crypto.randomUUID()),
      port,
    });

    if (result.ok) {
      onClose();
      return;
    }

    setUploading(false);
    setSubmitError(result.error);
  }

  const fileDescribedBy = `${fileId}-${fileError ? "error" : "hint"}`;

  return (
    <Dialog open onClose={onClose} labelledBy={headingId} dismissible={!uploading}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <h2 id={headingId} className="text-base font-semibold text-zinc-900">
          Subir highlight
        </h2>

        <div className="flex flex-col gap-1">
          <label htmlFor={fileId} className="text-sm font-medium text-zinc-900">
            Video
          </label>
          <input
            id={fileId}
            type="file"
            accept={HIGHLIGHT_MIME_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={uploading}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileDescribedBy}
            className="text-sm text-zinc-900 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-50"
          />
          {fileError ? (
            <span id={`${fileId}-error`} role="alert" className="text-xs text-red-700">
              {fileError}
            </span>
          ) : (
            <span id={`${fileId}-hint`} className="text-xs text-zinc-500">
              MP4, WebM o MOV. Hasta 50 MB y 2 minutos.
            </span>
          )}
        </div>

        <TextField
          id={titleFieldId}
          label="Título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={titleError ?? undefined}
          disabled={uploading}
        />

        {submitError ? (
          <p role="alert" className="text-sm text-red-700">
            {submitError}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          {uploading ? (
            <span
              role="status"
              className="mr-auto flex items-center gap-2 text-sm text-zinc-600"
            >
              <Spinner />
              Subiendo…
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={uploading || reading}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-60"
          >
            Subir
          </button>
        </div>
      </form>
    </Dialog>
  );
}
