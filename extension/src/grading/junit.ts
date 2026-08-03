// Parst die JUnit-XML von pytest — ohne externe XML-Bibliothek,
// weil die Struktur von pytest stabil und flach ist.
// Regel: ein Testcase gilt als bestanden, wenn er kein <failure>
// und kein <error> enthält.

export interface JunitCounts {
  passed: number;
  total: number;
}

export function parseJunitXml(xml: string): JunitCounts {
  let passed = 0;
  let total = 0;

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
    }
  }

  return { passed, total };
}
