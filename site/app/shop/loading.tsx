/* Squelette de chargement. Mêmes proportions que la grille réelle pour
   éviter tout décalage de mise en page à l'arrivée des données. */
export default function ShopLoading() {
  return (
    <div className="shell py-14 lg:py-20" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement du catalogue…</span>
      <div className="mb-14 border-b border-mineral-line pb-10">
        <div className="h-12 w-40 animate-pulse bg-paper-sunk" />
        <div className="mt-5 h-6 w-full max-w-xl animate-pulse bg-paper-sunk" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <div className="hidden flex-col gap-4 lg:flex">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse bg-paper-sunk" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-3 lg:gap-x-7">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] w-full animate-pulse bg-paper-sunk" />
              <div className="mt-4 h-5 w-3/4 animate-pulse bg-paper-sunk" />
              <div className="mt-2 h-4 w-1/2 animate-pulse bg-paper-sunk" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
