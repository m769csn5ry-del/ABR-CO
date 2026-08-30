export default function ProductLoading() {
  return (
    <div className="shell py-10 lg:py-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement de la fiche…</span>
      <div className="mb-8 h-4 w-40 animate-pulse bg-paper-sunk" />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
        <div className="aspect-[4/5] w-full animate-pulse bg-paper-sunk" />
        <div className="flex flex-col gap-4">
          <div className="h-5 w-24 animate-pulse bg-paper-sunk" />
          <div className="h-10 w-3/4 animate-pulse bg-paper-sunk" />
          <div className="h-5 w-1/2 animate-pulse bg-paper-sunk" />
          <div className="mt-4 h-8 w-32 animate-pulse bg-paper-sunk" />
          <div className="mt-6 h-32 w-full animate-pulse bg-paper-sunk" />
          <div className="h-14 w-full animate-pulse bg-paper-sunk" />
        </div>
      </div>
    </div>
  );
}
