import { ArrowRight } from "lucide-react";
import { GrainTexture } from "../components/ui/grain-texture";
import { Button } from "../components/ui/button";

const algorithms = [
  { id: "dijkstra", name: "Dijkstra's" },
  { id: "bellman-ford", name: "Bellman-Ford" },
  { id: "bfs", name: "BFS" },
  { id: "dfs", name: "DFS" },
  { id: "bfs-pathfinding", name: "BFS Pathfinding" },
  { id: "dfs-pathfinding", name: "DFS Pathfinding" },
  { id: "prims", name: "Prim's" },
  { id: "cycle-detection", name: "Cycle Detection" },
];

export interface AlgorithmPageProps {
  algorithmId: string;
  title: string;
  subtitle: string;
  ctaText: string;
  howItWorks: {
    description: string[];
    steps: string[];
  };
  properties: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[];
  useCases: {
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
}

export function AlgorithmLanding({
  algorithmId,
  title,
  subtitle,
  ctaText,
  howItWorks,
  properties,
  useCases,
  faq,
}: AlgorithmPageProps) {
  return (
    <div data-theme="dark" className="relative min-h-screen bg-[var(--color-paper)] text-[var(--color-text)] font-[var(--font-sans)]">
      <GrainTexture baseFrequency={3} />

      {/* Nav */}
      <nav className="relative max-w-3xl mx-auto px-6 pt-6 md:pt-10">
        <a
          href="/"
          className="focus-ring-animated inline-flex items-center gap-2.5 rounded-md"
        >
          <img src="https://ik.imagekit.io/lapstjup/graphisual/logo.png" alt="" className="w-8 h-8 rounded-md" />
        </a>
      </nav>

      <main className="relative max-w-3xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {title}
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
            {subtitle}
          </p>
        </header>

        {/* CTA */}
        <div className="mb-12">
          <Button variant="outline" size="lg" asChild>
            <a href={`/?algorithm=${algorithmId}`} className="gap-2">
              {ctaText}
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>

        {/* How it works */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-4">
            How It Works
          </h2>
          <div className="space-y-4 text-[var(--color-text-muted)] leading-relaxed">
            {howItWorks.description.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
            <ol className="space-y-0">
              {howItWorks.steps.map((step, i, arr) => (
                <li key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-divider)] text-xs font-semibold text-[var(--color-text)] shrink-0">
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="w-px flex-1 bg-[var(--color-divider)]" />
                    )}
                  </div>
                  <p className="pt-1 pb-5 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Key properties */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-6">Key Properties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {properties.map((prop, i) => (
              <PropertyCard key={i} icon={prop.icon} title={prop.title} description={prop.description} />
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Common Use Cases</h2>
          <ul className="space-y-3 text-[var(--color-text-muted)]">
            {useCases.map((uc, i) => (
              <UseCase key={i} icon={uc.icon} text={uc.text} />
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <dl className="space-y-6">
            {faq.map((item, i) => (
              <div key={i}>
                <dt className="font-semibold mb-2">{item.question}</dt>
                <dd className="text-[var(--color-text-muted)] leading-relaxed">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Bottom CTA */}
        <div className="border-t border-[var(--color-divider)] pt-10">
          <p className="text-[var(--color-text-muted)] mb-4">
            Ready to see it in action?
          </p>
          <Button variant="outline" size="lg" asChild>
            <a href={`/?algorithm=${algorithmId}`} className="gap-2">
              Open the Visualizer
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-[var(--color-divider)]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Explore More Algorithms */}
          <nav className="mb-8">
            <h2 className="text-sm font-semibold mb-3">Explore More Algorithms</h2>
            <ul className="flex flex-wrap gap-2">
              {algorithms
                .filter((a) => a.id !== algorithmId)
                .map((a) => (
                  <li key={a.id}>
                    <a
                      href={`/algorithm/${a.id}`}
                      className="focus-ring-animated inline-block px-3 py-1.5 text-sm rounded-md bg-[var(--color-surface-hover)] border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      {a.name}
                    </a>
                  </li>
                ))}
            </ul>
          </nav>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-muted)] border-t border-[var(--color-divider)] pt-6">
            <a
              href="/"
              className="focus-ring-animated inline-flex items-center gap-2 rounded-md hover:text-[var(--color-text)]"
            >
              <span className="font-semibold">Graphisual</span>
            </a>
            <p>Interactive graph editor and algorithm visualizer</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PropertyCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-divider)]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function UseCase({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-1 shrink-0 text-[var(--color-text-muted)]" />
      <span>{text}</span>
    </li>
  );
}
