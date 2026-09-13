// Reines Parsen der JUnit-XML von pytest — kein I/O.
//
// Wir parsen bewusst mit regulären Ausdrücken statt einer XML-Bibliothek:
// Node bringt keinen XML-Parser mit, und die pytest-Ausgabe ist eine feste,
// flache Struktur (<testsuite> mit <testcase>-Kindern). Sollte das je nicht
// mehr reichen, ist der Wechsel auf eine Bibliothek auf dieses Modul begrenzt.

export interface TestCaseResult {
  name: string;
  passed: boolean;
  kind?: string;
  detail?: string;
}

/**
 * Liest alle <testcase>-Elemente aus einer JUnit-XML-Datei.
 * Ein Testcase gilt als bestanden, wenn er kein <failure> und
 * kein <error> oder <skipped> enthält.
 */
export function parseJunitXml(xml: string): TestCaseResult[] {
  const results: TestCaseResult[] = [];
  // Trifft sowohl selbstschliessende (<testcase ... />) als auch
  // normale Elemente (<testcase ...>...</testcase>).
  const testcasePattern = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const match of xml.matchAll(testcasePattern)) {
    const attributes = match[1];
    const body = match[2] ?? "";
    const nameMatch = attributes.match(/\bname="([^"]*)"/);
    const name = decodeXmlEntities(nameMatch ? nameMatch[1] : "");
    const failed = /<(failure|error|skipped)\b/.test(body);
    const issue = body.match(/<(failure|error|skipped)\b([^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/);
    const message = issue?.[2].match(/\bmessage="([^"]*)"/)?.[1] || "";
    results.push({ name, passed: !failed, kind: issue?.[1],
      detail: decodeXmlEntities(issue?.[3] || message) });
  }
  return results;
}

// Die fünf Standard-Entities reichen für Attributwerte von pytest.
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, value: string) => {
      const n = value.startsWith("x") ? parseInt(value.slice(1), 16) : Number(value);
      return n <= 0x10ffff ? String.fromCodePoint(n) : "�";
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
