export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 bg-white/70 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-600">Cargando datos meteorológicos...</p>
      </div>
    </div>
  )
}
