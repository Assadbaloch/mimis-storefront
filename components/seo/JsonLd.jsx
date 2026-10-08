// schema.org structured data for search engines and AI assistants.
// Server-rendered into the page HTML; invisible to customers. "<" is escaped so
// no text inside the data can ever close the script tag.
export default function JsonLd({ data }) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
