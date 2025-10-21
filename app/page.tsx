import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-30">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/5 to-transparent" />

        <div className="container mx-auto px-4 lg:px-9">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-display-lg font-semibold text-foreground">
              PDF Autofill Made Simple
            </h1>
            <p className="mt-6 text-body-lg text-foreground-muted">
              Upload PDF forms, visually map fields with a click, and generate
              filled PDFs programmatically. Perfect for organizations that need
              to process forms at scale.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/signup">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/dashboard">View Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-30">
        <div className="container mx-auto px-4 lg:px-9">
          <div className="text-center mb-16">
            <h2 className="text-display-md font-semibold text-foreground">
              Everything you need
            </h2>
            <p className="mt-4 text-body-lg text-foreground-muted">
              Professional PDF processing for modern teams
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Visual Field Mapping"
              description="Click on your PDF to map fields. No code required. Works with any PDF."
            />
            <FeatureCard
              title="Coordinate-Based Filling"
              description="Precise text placement using coordinates. Supports multi-page PDFs and UTF-8 characters."
            />
            <FeatureCard
              title="API Access"
              description="Generate PDFs programmatically. Perfect for integrations and automation."
            />
            <FeatureCard
              title="Team Collaboration"
              description="Invite team members, manage templates together, and control access."
            />
            <FeatureCard
              title="Template Library"
              description="Share public templates across organizations. Build once, use everywhere."
            />
            <FeatureCard
              title="Usage Analytics"
              description="Track PDF generation, monitor usage, and optimize your workflows."
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-secondary p-6 transition-all duration-300 hover:border-border-strong hover:shadow-lg hover:shadow-accent/5">
      <h3 className="text-h4 font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-body-sm text-foreground-muted">{description}</p>
    </div>
  )
}
