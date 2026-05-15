import { Navbar } from '@/components/navbar'
import { AppSidebar } from '@/components/app-sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
