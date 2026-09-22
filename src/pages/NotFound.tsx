import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <PageWrapper title="Page Not Found">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <p className="text-7xl font-display font-bold text-brand-200">404</p>
        <h1 className="text-xl font-display font-semibold text-zinc-800">Page not found</h1>
        <p className="text-sm text-zinc-500">This page doesn't exist or was moved.</p>
        <Link to="/"><Button variant="primary">Back to Dashboard</Button></Link>
      </div>
    </PageWrapper>
  )
}
