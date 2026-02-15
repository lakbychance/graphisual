import { ArrowRight, Route, Network, Timer, Scale, Navigation } from "lucide-react";

export function DijkstraLanding() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-text)] font-[var(--font-sans)]">
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <header className="mb-12">
          <a
            href="/"
            className="focus-ring-animated inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-8 rounded-md"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Back to Graphisual
          </a>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Dijkstra's Algorithm Visualizer
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
            Visualize how Dijkstra's algorithm finds the shortest path between
            nodes in a weighted graph. Draw your own graph, set edge weights,
            and watch the algorithm explore step by step.
          </p>
        </header>

        {/* CTA */}
        <div className="mb-16">
          <a
            href="/?algorithm=dijkstra"
            className="focus-ring-animated inline-flex items-center gap-2 h-12 px-8 text-base rounded-xl bg-[var(--color-accent)] text-white font-semibold shadow-[var(--shadow-raised),var(--highlight-edge)] hover:bg-[var(--color-accent-pressed)]"
          >
            Visualize Dijkstra's Algorithm
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* How it works */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-4">
            How Dijkstra's Algorithm Works
          </h2>
          <div className="space-y-4 text-[var(--color-text-muted)] leading-relaxed">
            <p>
              Dijkstra's algorithm is a greedy algorithm that finds the shortest
              path from a source node to all other nodes in a weighted graph
              with non-negative edge weights. It was conceived by computer
              scientist Edsger W. Dijkstra in 1956.
            </p>
            <p>
              The algorithm maintains a set of unvisited nodes and a distance
              table. It repeatedly selects the unvisited node with the smallest
              known distance, visits it, and updates the distances of its
              neighbors. This process continues until the destination node is
              visited or all reachable nodes have been explored.
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li>
                Initialize the source node distance to 0 and all others to
                infinity
              </li>
              <li>Add the source node to a priority queue</li>
              <li>
                Extract the node with the minimum distance from the queue
              </li>
              <li>
                For each neighbor, calculate the tentative distance through the
                current node
              </li>
              <li>
                If the new distance is shorter, update it and add the neighbor
                to the queue
              </li>
              <li>
                Repeat until the destination is reached or the queue is empty
              </li>
            </ol>
          </div>
        </section>

        {/* Key properties */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-6">Key Properties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PropertyCard
              icon={Timer}
              title="Time Complexity"
              description="O((V + E) log V) with a binary heap priority queue, where V is vertices and E is edges."
            />
            <PropertyCard
              icon={Scale}
              title="Weighted Graphs"
              description="Designed for graphs with non-negative edge weights. For negative weights, use Bellman-Ford instead."
            />
            <PropertyCard
              icon={Route}
              title="Optimal Paths"
              description="Guarantees the shortest path between the source and every reachable node in the graph."
            />
            <PropertyCard
              icon={Network}
              title="Greedy Strategy"
              description="Always processes the closest unvisited node first, building up shortest paths incrementally."
            />
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">Common Use Cases</h2>
          <ul className="space-y-3 text-[var(--color-text-muted)]">
            <UseCase
              icon={Navigation}
              text="GPS navigation — finding the fastest route between two locations"
            />
            <UseCase
              icon={Network}
              text="Network routing protocols — OSPF uses Dijkstra's to compute shortest paths"
            />
            <UseCase
              icon={Route}
              text="Maps and directions — services like Google Maps use variants of Dijkstra's algorithm"
            />
          </ul>
        </section>

        {/* Bottom CTA */}
        <div className="border-t border-[var(--color-divider)] pt-10">
          <p className="text-[var(--color-text-muted)] mb-4">
            Ready to see it in action?
          </p>
          <a
            href="/?algorithm=dijkstra"
            className="focus-ring-animated inline-flex items-center gap-2 h-12 px-8 text-base rounded-xl bg-[var(--color-accent)] text-white font-semibold shadow-[var(--shadow-raised),var(--highlight-edge)] hover:bg-[var(--color-accent-pressed)]"
          >
            Open the Visualizer
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
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
    <div className="p-4 rounded-lg bg-[var(--color-surface)] shadow-[var(--shadow-raised)]">
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
