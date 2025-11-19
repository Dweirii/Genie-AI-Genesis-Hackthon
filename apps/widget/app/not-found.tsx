import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8 text-center">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-primary">Welcome to Al-Aoun</h1>
          <h2 className="text-2xl font-semibold">Your Complete AI Assistant Platform</h2>
          <p className="text-muted-foreground text-lg">
            Our platform consists of two powerful applications working together
          </p>
        </div>

        {/* Divider */}
        <div className="py-4">
          <div className="mx-auto h-px w-32 bg-border" />
        </div>

        {/* Links Section */}
        <div className="space-y-6">
          <p className="text-lg font-medium">
            Explore Both Applications:
          </p>

          <div className="space-y-4">
            {/* Widget Demo Link */}
            <Link
              href="https://demo-widget-hackathon.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg border-2 border-primary/50 bg-card p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl">📱</span>
                  <h3 className="text-xl font-semibold text-primary group-hover:underline">
                    Widget Application
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  The customer-facing chat widget that you can embed on any website.
                  This is what your visitors see and interact with - a friendly AI assistant
                  ready to help answer questions, provide support, and engage with users in real-time.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2 text-sm font-medium text-primary">
                  <span>Try Live Demo</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>

            {/* Web App Link */}
            <Link
              href="https://genie-ai-genesis-hackthon-web.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg border-2 border-primary/50 bg-card p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl">🎛️</span>
                  <h3 className="text-xl font-semibold text-primary group-hover:underline">
                    Dashboard Application
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  The admin control panel where you manage everything behind the scenes.
                  Customize your assistant's personality, upload documents for it to learn from,
                  view all conversations, monitor performance, and configure settings - all in one place.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2 text-sm font-medium text-primary">
                  <span>Open Dashboard</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Connection Info */}
        <div className="pt-4 space-y-2">
          <div className="inline-block rounded-full bg-primary/10 px-4 py-2">
            <p className="text-sm font-medium text-primary">
              🔗 Two Apps • One Complete Solution
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            The widget and dashboard work together seamlessly to provide a complete AI assistant experience
          </p>
        </div>
      </div>
    </div>
  )
}

