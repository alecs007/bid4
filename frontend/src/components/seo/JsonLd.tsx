/**
 * A structured-data block.
 *
 * <p>`application/ld+json` is a data block, not a program: the browser never
 * executes it, and React does not escape the contents of a script tag, so the
 * one thing that has to be handled here is a string in the data closing the tag
 * early. `<` is escaped to its unicode form, which JSON parsers read back
 * identically and an HTML parser cannot mistake for markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
