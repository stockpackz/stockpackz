import fs from "fs";
import path from "path";
import { DocsViewer, type DocSection } from "@/components/docs/docs-viewer";

export const metadata = {
  title: "Documentation | Stockpackz",
  description: "In-depth documentation for Stockpackz on Robinhood Chain",
};

const DOC_FILES = [
  { slug: "readme", file: "README.md", title: "Introduction" },
  { slug: "overview", file: "01-overview.md", title: "Overview" },
  { slug: "tokenized-stocks", file: "02-tokenized-stocks.md", title: "Tokenized Stocks" },
  { slug: "capsules", file: "03-capsules.md", title: "Packs" },
  { slug: "architecture", file: "04-architecture.md", title: "Architecture" },
  { slug: "opening-flow", file: "05-opening-flow.md", title: "Opening Flow" },
  { slug: "collections", file: "06-collections.md", title: "Collections" },
  { slug: "backend", file: "07-backend-integration.md", title: "Backend Integration" },
  { slug: "how-to-play", file: "08-how-to-play.md", title: "How to Play" },
  { slug: "contracts", file: "09-protocol-contracts.md", title: "Protocol Contracts" },
  { slug: "token-utility", file: "10-token-utility.md", title: "Token Utility" },
  { slug: "security-model", file: "11-security-model.md", title: "Security Model" },
  { slug: "threat-model", file: "12-threat-model.md", title: "Threat Model" },
  { slug: "faq", file: "13-faq.md", title: "FAQ" },
  { slug: "roadmap", file: "14-roadmap.md", title: "Roadmap" },
];

function loadDocs(): DocSection[] {
  const docsDir = path.join(process.cwd(), "docs");
  return DOC_FILES.map(({ slug, file, title }) => ({
    slug,
    title,
    content: fs.readFileSync(path.join(docsDir, file), "utf-8"),
  }));
}

export default function DocsPage() {
  const sections = loadDocs();
  return (
    <>
      <style>{`
        .docs-prose h1 { font-size: 1.75rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 1rem; color: #fff; }
        .docs-prose h2 { font-size: 1.25rem; font-weight: 600; margin-top: 2.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.5rem; color: #fff; }
        .docs-prose h3 { font-size: 1.05rem; font-weight: 600; margin-top: 1.75rem; margin-bottom: 0.5rem; color: #fff; }
        .docs-prose p { margin-bottom: 1rem; font-size: 0.9375rem; line-height: 1.75; color: rgba(255,255,255,0.55); }
        .docs-prose ul, .docs-prose ol { margin-bottom: 1rem; padding-left: 1.5rem; font-size: 0.9375rem; color: rgba(255,255,255,0.55); }
        .docs-prose li { margin-bottom: 0.35rem; line-height: 1.6; }
        .docs-prose strong { color: #fafafa; font-weight: 600; }
        .docs-prose a { color: #00c805; text-decoration: underline; text-underline-offset: 2px; }
        .docs-prose code { background: rgba(255,255,255,0.06); padding: 0.15rem 0.4rem; border-radius: 0.375rem; font-size: 0.875em; font-family: var(--font-geist-mono); color: #fafafa; }
        .docs-prose pre { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; padding: 1rem 1.25rem; overflow-x: auto; margin-bottom: 1.25rem; }
        .docs-prose pre code { background: none; padding: 0; font-size: 0.8125rem; line-height: 1.6; }
        .docs-prose table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; font-size: 0.875rem; }
        .docs-prose th { text-align: left; padding: 0.625rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.1); color: #fafafa; font-weight: 600; }
        .docs-prose td { padding: 0.625rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.04); color: #a3a3a3; }
        .docs-prose blockquote { border-left: 3px solid #00c805; padding-left: 1rem; margin: 1rem 0; color: #737373; font-style: italic; }
        .docs-prose hr { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 2rem 0; }
      `}</style>
      <DocsViewer sections={sections} />
    </>
  );
}
