import Link from "next/link";
import { notFound } from "next/navigation";
import { legalDocuments } from "@/lib/legal";
import { PublicHeader } from "@/components/public-header";

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  const item = legalDocuments[document];
  if (!item) notFound();
  return <main className="legal-page"><PublicHeader /><article><span className="overline">Effective July 27, 2026</span><h1>{item.title}</h1><p className="legal-summary">{item.summary}</p>{item.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}<aside><b>Questions about this document?</b><p>Contact ngbridz@gmail.com. Final company registration details and jurisdiction will be added before accepting live payments.</p></aside><div className="legal-links"><Link href="/support">Contact support</Link></div></article></main>;
}
