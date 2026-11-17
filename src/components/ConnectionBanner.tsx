/** Shown across the top while this browser has no connection. It reconnects by itself. */
export function ConnectionBanner() {
  return (
    <div
      role="alert"
      className="ring-fold/40 fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-[#3a1520]/95 px-4 py-2 text-center text-sm font-medium text-[#ffd0d8] shadow-[0_8px_24px_rgb(0_0_0/0.4)] ring-1 backdrop-blur"
    >
      You’re offline. Reconnecting as soon as your connection is back…
    </div>
  )
}
