'use client';

import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { classNames } from '@/lib/format';

/* Champs de formulaire. Chaque contrôle a un label lié, un message d'aide
   et un message d'erreur reliés par aria-describedby. Pas de placeholder
   utilisé comme label : il disparaît à la saisie. */

const CONTROL =
  'w-full rounded-xs border border-mineral-line bg-paper-raised px-3.5 py-3 text-body ' +
  'placeholder:text-mineral/70 transition-[border-color] duration-[180ms] ' +
  'hover:border-mineral focus:border-ink focus:outline-none';

interface WrapProps {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, required, children }: WrapProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
        {required ? (
          <span className="text-mineral"> · obligatoire</span>
        ) : (
          <span className="text-mineral"> · facultatif</span>
        )}
      </label>
      {hint ? (
        <p id={hintId} className="text-small text-mineral">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p id={errorId} className="text-small text-oxide" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...rest
}: { invalid?: boolean } & ComponentPropsWithoutRef<'input'>) {
  return (
    <input
      className={classNames(CONTROL, invalid && 'border-oxide hover:border-oxide', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...rest
}: { invalid?: boolean } & ComponentPropsWithoutRef<'textarea'>) {
  return (
    <textarea
      rows={4}
      className={classNames(CONTROL, 'resize-y', invalid && 'border-oxide', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: { invalid?: boolean } & ComponentPropsWithoutRef<'select'>) {
  return (
    <select
      className={classNames(CONTROL, 'appearance-none pr-10', invalid && 'border-oxide', className)}
      aria-invalid={invalid || undefined}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5l5-5' fill='none' stroke='%235F6367' stroke-width='1.5'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.875rem center',
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

/** Case à cocher / bouton radio présentés en pastille cliquable large. */
export function Choice({
  type,
  checked,
  children,
  ...rest
}: { type: 'checkbox' | 'radio'; children: ReactNode } & ComponentPropsWithoutRef<'input'>) {
  return (
    <label
      className={classNames(
        'press flex min-h-11 cursor-pointer items-center gap-3 rounded-xs border px-3.5 py-2.5 text-small',
        'transition-[border-color,background-color] duration-[180ms]',
        checked
          ? 'border-verdigris bg-verdigris-wash text-verdigris-deep'
          : 'border-mineral-line bg-paper-raised hover:border-mineral',
      )}
    >
      <input
        type={type}
        checked={checked}
        className="size-4 shrink-0 accent-[#1C5750]"
        {...rest}
      />
      <span>{children}</span>
    </label>
  );
}
