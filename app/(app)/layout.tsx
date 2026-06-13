import { Navbar } from '@/components/navbar'
import { AppSidebar } from '@/components/app-sidebar'
import { PageTransition } from '@/components/motion/page-transition'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar variant="app" />
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  )
}
