"use client";

import { useId, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { CAUSE } from "@/lib/config";
import { formatFileSize, toFileRef } from "@/lib/mock/uploads";
import type { UploadedFileRef } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const DEFAULT_ACCEPT = "image/*,application/pdf";

function tooBig(file: File, maxMb: number): boolean {
  return file.size > maxMb * 1024 * 1024;
}

/** A thumbnail for images, a document glyph for everything else. */
function Thumb({ file, className }: { file: UploadedFileRef; className?: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(file.previewUrl) && !broken;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-100",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL, no loader
        <img
          src={file.previewUrl}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icons.invoice aria-hidden="true" className="h-5 w-5 text-ink-500" />
      )}
    </span>
  );
}

/** Nothing is uploaded — see `toFileRef` for what happens once there is a server. */
export function FileUpload({
  label,
  hint,
  accept = DEFAULT_ACCEPT,
  value,
  onChange,
  maxSizeMb = CAUSE.MAX_UPLOAD_MB,
  required,
  error,
  className,
}: {
  label: string;
  hint?: string;
  accept?: string;
  value?: UploadedFileRef;
  onChange: (file: UploadedFileRef | undefined) => void;
  maxSizeMb?: number;
  required?: boolean;
  error?: string;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (tooBig(file, maxSizeMb)) {
      setSizeError(`Fișierul depășește ${maxSizeMb} MB.`);
      return;
    }
    setSizeError(null);
    onChange(toFileRef(file));
  };

  const remove = () => {
    setSizeError(null);
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const shown = error ?? sizeError;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="font-display text-sm font-bold text-ink-800"
      >
        {label}
        {required ? (
          <span className="text-accent-600" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {hint ? <p className="text-xs leading-relaxed text-ink-600">{hint}</p> : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        aria-invalid={shown ? true : undefined}
        onChange={(event) => pick(event.target.files?.[0])}
        className="sr-only"
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-ink-200 p-2.5">
          <Thumb file={value} className="h-11 w-11" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink-900">
              {value.fileName}
            </span>
            <span className="numeric block text-xs text-ink-500">
              {formatFileSize(value.sizeBytes)}
            </span>
          </span>
          <button
            type="button"
            onClick={remove}
            aria-label={`Șterge ${value.fileName}`}
            className="rounded-xl p-2 text-ink-500 transition hover:bg-ink-100 hover:text-danger-600"
          >
            <Icons.remove aria-hidden="true" className="h-4 w-4 shrink-0" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-3.5 transition",
            shown
              ? "border-danger-500 bg-danger-50/40"
              : "border-ink-200 hover:border-primary-400 hover:bg-primary-50/50",
          )}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
            <Icons.upload aria-hidden="true" className="h-5 w-5 shrink-0" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink-800">
              Alege un fișier
            </span>
            <span className="block text-xs text-ink-500">
              PDF sau imagine, până la {maxSizeMb} MB
            </span>
          </span>
        </label>
      )}

      {shown ? (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-sm font-semibold text-danger-600"
        >
          <Icons.error aria-hidden="true" className="h-4 w-4 shrink-0" />
          {shown}
        </p>
      ) : null}
    </div>
  );
}

/** Several images at once — the cause gallery, and nothing heavier. */
export function FileUploadGrid({
  label,
  hint,
  values,
  onChange,
  max = CAUSE.MAX_GALLERY_IMAGES,
  maxSizeMb = CAUSE.MAX_UPLOAD_MB,
  className,
}: {
  label: string;
  hint?: string;
  values: UploadedFileRef[];
  onChange: (files: UploadedFileRef[]) => void;
  max?: number;
  maxSizeMb?: number;
  className?: string;
}) {
  const id = useId();
  const [sizeError, setSizeError] = useState<string | null>(null);
  const room = max - values.length;

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, room);
    const oversized = picked.filter((file) => tooBig(file, maxSizeMb));
    setSizeError(
      oversized.length ? `Unele fișiere depășesc ${maxSizeMb} MB.` : null,
    );
    const kept = picked.filter((file) => !tooBig(file, maxSizeMb));
    if (kept.length) onChange([...values, ...kept.map(toFileRef)]);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="font-display text-sm font-bold text-ink-800">
        {label}
      </label>
      {hint ? <p className="text-xs leading-relaxed text-ink-600">{hint}</p> : null}

      <input
        id={id}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          add(event.target.files);
          event.target.value = "";
        }}
        className="sr-only"
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {values.map((file, index) => (
          <div key={file.fileRef} className="group relative aspect-square">
            <Thumb file={file} className="h-full w-full rounded-2xl" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              aria-label={`Șterge imaginea ${index + 1}`}
              className="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-ink-600 shadow-sm transition hover:text-danger-600"
            >
              <Icons.close aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        ))}

        {room > 0 ? (
          <label
            htmlFor={id}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 text-ink-500 transition hover:border-primary-400 hover:bg-primary-50/50"
          >
            <Icons.photo aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="text-[11px] font-bold">Adaugă</span>
          </label>
        ) : null}
      </div>

      <p className="numeric text-xs text-ink-500">
        {values.length} din {max} imagini
      </p>

      {sizeError ? (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {sizeError}
        </p>
      ) : null}
    </div>
  );
}
