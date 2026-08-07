// Parst die JUnit-XML von pytest — ohne externe XML-Bibliothek,
// weil die Struktur von pytest stabil und flach ist.
// Regel: ein Testcase gilt als bestanden, wenn er kein <failure>
// und kein <error> enthält.

export interface FailedTest {
  // z. B. "test_n" — der Name der Testfunktion
  name: string;
  // z. B. "test_aufgabe_4" — aus welcher Testdatei der Test stammt
  classname: string;
  // erste Zeile der pytest-Fehlermeldung, z. B. "assert None == 5"
  message: string;
}

export interface JunitCounts {
  passed: number;
  total: number;
  failures: FailedTest[];
}

export function parseJunitXml(xml: string): JunitCounts {
  let passed = 0;
  let total = 0;
  const failures: FailedTest[] = [];

  // Findet jeden <testcase ...>-Start; Gruppe 1 sagt, ob er
  // selbstschließend ist ("/>") oder Kind-Elemente haben kann (">").
  const testcaseRe = /<testcase\b[^>]*?(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = testcaseRe.exec(xml)) !== null) {
    total += 1;

    if (match[1] === "/") {
      // Selbstschließend => keine Kind-Elemente => bestanden
      passed += 1;
      continue;
    }

    // Inhalt bis zum schließenden Tag untersuchen
    const end = xml.indexOf("</testcase>", testcaseRe.lastIndex);
    const body = end === -1 ? "" : xml.slice(testcaseRe.lastIndex, end);
    if (!/<(failure|error)\b/.test(body)) {
      passed += 1;
      continue;
    }

    failures.push({
      name: readAttribute(match[0], "name"),
      classname: readAttribute(match[0], "classname"),
      message: readFailureMessage(body),
    });
  }

  return { passed, total, failures };
}

function readAttribute(tag: string, attribute: string): string {
  // \s davor, sonst würde `name=` auch mitten in `classname=` treffen
  const found = tag.match(new RegExp(`\\s${attribute}="([^"]*)"`));
  return found ? unescapeXml(found[1]) : "";
}

function readFailureMessage(body: string): string {
  const found = body.match(/<(?:failure|error)\b[^>]*?message="([^"]*)"/);
  if (!found) {
    return "Test fehlgeschlagen";
  }
  // Nur die erste Zeile, gekürzt — Details stehen im pytest-Output
  const firstLine = unescapeXml(found[1]).split("\n")[0].trim();
  return firstLine.length > 160 ? firstLine.slice(0, 157) + "…" : firstLine;
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, "\n")
    .replace(/&amp;/g, "&");
}
