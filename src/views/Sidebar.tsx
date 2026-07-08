interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <>
      {/* Desktop: sidebar izquierda fija */}
      <aside className="hidden lg:block fixed left-0 top-0 h-screen w-[350px] overflow-y-auto bg-white shadow-lg z-10">
        {children}
      </aside>

      {/* Mobile: bottom sheet */}
      <aside className="lg:hidden fixed bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto bg-white shadow-lg rounded-t-xl z-10">
        {/* Handle visual */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {children}
      </aside>
    </>
  )
}
