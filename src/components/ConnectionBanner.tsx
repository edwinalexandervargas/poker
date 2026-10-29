/** Shown across the top while this browser has no connection. It reconnects by itself. */
export function ConnectionBanner() {
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 bg-red-500/90 px-4 py-2 text-center text-sm font-medium text-white"
    >
      You’re offline. Reconnecting as soon as your connection is back…
    </div>
  )
}
