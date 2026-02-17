import { OG_IMAGE, SITE_NAME, AUTHOR_NAME, AUTHOR_URL, BASE_URL } from "@/utils/constants";

export function makeJsonLd(opts: {
  name: string;
  title: string;
  description: string;
  url: string;
  aboutName: string;
  aboutDescription: string;
  sameAs: string;
  datePublished: string;
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
          "name": AUTHOR_NAME,
          "url": AUTHOR_URL,
        },
        "datePublished": opts.datePublished,
        "publisher": {
          "@type": "Organization",
          "name": SITE_NAME,
          "url": BASE_URL,
        },
        "mainEntity": {
          "@type": "SoftwareApplication",
          "name": SITE_NAME,
          "applicationCategory": "EducationalApplication",
          "url": BASE_URL,
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
