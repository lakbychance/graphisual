import { OG_IMAGE } from "@/utils/constants";

export function makeJsonLd(opts: {
  name: string;
  title: string;
  description: string;
  url: string;
  aboutName: string;
  aboutDescription: string;
  sameAs: string;
  faq: { question: string; answer: string }[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "name": opts.name,
        "headline": opts.title,
        "description": opts.description,
        "url": opts.url,
        "image": OG_IMAGE,
        "author": {
          "@type": "Person",
          "name": "Lakshya Thakur",
          "url": "https://x.com/lakbychance",
        },
        "datePublished": "2026-02-15",
        "publisher": {
          "@type": "Organization",
          "name": "Graphisual",
          "url": "https://graphisual.app",
        },
        "mainEntity": {
          "@type": "SoftwareApplication",
          "name": "Graphisual",
          "applicationCategory": "EducationalApplication",
          "url": "https://graphisual.app",
        },
        "about": {
          "@type": "Thing",
          "name": opts.aboutName,
          "description": opts.aboutDescription,
          "sameAs": opts.sameAs,
        },
      },
      {
        "@type": "FAQPage",
        "mainEntity": opts.faq.map((item) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer,
          },
        })),
      },
    ],
  };
}
