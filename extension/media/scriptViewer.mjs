// Läuft im Webview „Vorlesungsskript“: rendert das PDF mit pdf.js, springt zur
// Seite der Fundstelle und hebt deren Überschrift über die Suche hervor.
// Konfiguration (URLs, Ziel) kommt aus dem JSON-Block #config, siehe src/script/scriptViewer.ts.

const config = JSON.parse(document.getElementById("config").textContent);
const status = document.getElementById("status");

try {
  // pdf.mjs setzt globalThis.pdfjsLib, das pdf_viewer.mjs voraussetzt.
  await import(config.pdfjs);
  const { EventBus, PDFFindController, PDFLinkService, PDFViewer } = await import(config.viewer);
  const lib = globalThis.pdfjsLib;

  // Webviews erlauben Worker nur aus blob:-URLs, nicht direkt von Ressourcen-URLs.
  const workerCode = await (await fetch(config.worker)).text();
  const workerUrl = URL.createObjectURL(new Blob([workerCode], { type: "text/javascript" }));
  lib.GlobalWorkerOptions.workerPort = new Worker(workerUrl, { type: "module" });

  const eventBus = new EventBus();
  const linkService = new PDFLinkService({ eventBus });
  const findController = new PDFFindController({ eventBus, linkService });
  const viewer = new PDFViewer({
    container: document.getElementById("viewerContainer"), eventBus, linkService, findController,
  });
  linkService.setViewer(viewer);

  const pdf = await lib.getDocument({
    url: config.pdf,
    disableRange: true,
    disableStream: true,
    isEvalSupported: false,
    enableXfa: false,
    standardFontDataUrl: config.fonts,
    wasmUrl: config.wasm,
  }).promise;

  const show = ({ page, heading }) => {
    viewer.currentPageNumber = Math.min(Math.max(1, page), pdf.numPages);
    if (heading) {
      // Suche ab der aktuellen Seite: markiert die Überschrift der Fundstelle.
      eventBus.dispatch("find", {
        source: null, type: "", query: heading, caseSensitive: false, entireWord: false,
        highlightAll: true, findPrevious: false, matchDiacritics: false,
      });
    }
  };

  eventBus.on("pagesinit", () => {
    viewer.currentScaleValue = "page-width";
    show(config.target);
    status.remove();
  });
  viewer.setDocument(pdf);
  linkService.setDocument(pdf);
  window.addEventListener("message", event => {
    if (event.data?.type === "goto") { show(event.data); }
  });
} catch (error) {
  status.textContent = `Das Skript konnte nicht angezeigt werden: ${error?.message ?? error}`;
}
