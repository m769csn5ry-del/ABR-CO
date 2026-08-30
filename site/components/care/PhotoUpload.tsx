'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconClose } from '@/components/ui/Icon';
import { classNames } from '@/lib/format';

/* Ajout de photos.
 *
 * Les fichiers restent en mémoire côté client tant que le stockage
 * n'est pas raccordé (voir app/api/entretien/route.ts). Les aperçus
 * passent par des URL d'objet, révoquées à la suppression et au
 * démontage — sinon la page fuit à chaque essai.
 *
 * Le clic sur la zone, le glisser-déposer et le clavier ouvrent tous
 * le même sélecteur natif : c'est lui qui donne l'appareil photo sur
 * mobile (`capture` laissé libre pour ne pas forcer la caméra). */

export interface UploadedPhoto {
  id: string;
  file: File;
  url: string;
}

const MAX_FILES = 8;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export function PhotoUpload({
  photos,
  onChange,
}: {
  photos: UploadedPhoto[];
  onChange: (next: UploadedPhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Révoque toutes les URL restantes quand le composant disparaît.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(
    () => () => {
      for (const p of photosRef.current) URL.revokeObjectURL(p.url);
    },
    [],
  );

  const accept = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const incoming = Array.from(files);
      const room = MAX_FILES - photos.length;

      if (room <= 0) {
        setError(`Maximum ${MAX_FILES} photos.`);
        return;
      }

      const rejected: string[] = [];
      const accepted: UploadedPhoto[] = [];

      for (const file of incoming.slice(0, room)) {
        if (!ACCEPTED.includes(file.type)) {
          rejected.push(`${file.name} : format non accepté`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          rejected.push(`${file.name} : au-delà de 8 Mo`);
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          url: URL.createObjectURL(file),
        });
      }

      if (incoming.length > room) rejected.push(`${incoming.length - room} photo(s) au-delà de la limite`);
      setError(rejected.length ? rejected.join(' · ') : null);
      if (accepted.length) onChange([...photos, ...accepted]);
    },
    [photos, onChange],
  );

  function remove(id: string) {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.url);
    onChange(photos.filter((p) => p.id !== id));
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          accept(e.dataTransfer.files);
        }}
        className={classNames(
          'rounded-xs border border-dashed p-6 text-center transition-colors duration-[180ms]',
          dragOver ? 'border-verdigris bg-verdigris-wash' : 'border-mineral-line bg-paper-raised',
        )}
      >
        <input
          ref={inputRef}
          id="photos"
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(e) => {
            accept(e.target.files);
            // Permet de resélectionner le même fichier après suppression.
            e.target.value = '';
          }}
        />
        <label
          htmlFor="photos"
          className="press inline-flex min-h-11 cursor-pointer items-center rounded-xs border border-ink/25 px-5 text-small font-medium transition-colors duration-[180ms] hover:border-ink"
        >
          Choisir des photos
        </label>
        <p className="mt-3 text-small text-mineral">
          Ou dépose-les ici. JPEG, PNG ou WebP, 8 Mo maximum par photo, {MAX_FILES} au total.
        </p>
        <p className="mt-1 text-small text-mineral">
          Les plus utiles : les deux profils, le dessus, la semelle, et un gros plan de chaque
          zone qui te gêne.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-small text-oxide">
          {error}
        </p>
      ) : null}

      <p aria-live="polite" className="text-small text-mineral">
        {photos.length === 0
          ? 'Aucune photo ajoutée.'
          : `${photos.length} photo${photos.length > 1 ? 's' : ''} sur ${MAX_FILES}.`}
      </p>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              {/* Aperçu local : next/image n'apporte rien sur une blob URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`Aperçu de ${photo.file.name}`}
                className="aspect-square w-full rounded-xs border border-mineral-line object-cover"
              />
              <button
                type="button"
                onClick={() => remove(photo.id)}
                className="press absolute right-1 top-1 grid size-8 place-items-center rounded-xs bg-ink/85 text-paper transition-colors duration-[180ms] hover:bg-ink"
                aria-label={`Retirer ${photo.file.name}`}
              >
                <IconClose className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
