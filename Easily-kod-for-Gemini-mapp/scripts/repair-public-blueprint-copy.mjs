const projectId = process.argv[2];
const base = process.argv[3] || "http://127.0.0.1:3847";
if (!projectId) throw new Error("project id is required");

const loaded = await fetch(`${base}/api/projects/${projectId}`).then((response) => response.json());
if (!loaded.ok || !loaded.project?.draftDocument) throw new Error("project could not be loaded");
const document = loaded.project.draftDocument;

function repair(execution) {
  if (!execution || !Array.isArray(execution.sections)) return;
  const categories = execution.sections.find((section) => section.component === "category-showcase");
  if (categories) {
    categories.body = ["Upptäck presenter och inredningsdetaljer för olika smaker, stilar och tillfällen."];
    const categoryCopy = [
      ["Presenter och detaljer", "Hitta något personligt att ge bort eller ta med hem."],
      ["För hem och vardag", "Upptäck sådant som kan göra rummet varmare och mer personligt."],
    ];
    (categories.items || []).forEach((item, index) => {
      item.title = categoryCopy[index]?.[0] || item.title;
      item.body = categoryCopy[index]?.[1] || item.body;
      item.badge = index ? "HEM & VARDAG" : "PRESENTER";
      item.priceHint = index ? "Se mer →" : "Utforska →";
    });
  }

  const gallery = execution.sections.find((section) => section.component === "media-gallery");
  if (gallery) {
    gallery.body = ["Se närmare på material, former och detaljer som kan ge hemmet eller presenten rätt känsla."];
    const galleryCopy = [
      "Utvalda former och detaljer ur sortimentet.",
      "Material och nyanser att upptäcka på nära håll.",
      "Presenter och inredning för olika stilar och åldrar.",
    ];
    (gallery.items || []).forEach((item, index) => {
      item.body = galleryCopy[index] || "Upptäck fler detaljer ur sortimentet.";
    });
  }

  const contact = execution.sections.find((section) => section.component === "contact-block");
  if (contact) {
    contact.body = [
      "Välkommen att kontakta oss om du vill veta mer om butiken eller sortimentet.",
      "Du hittar QuriAsdesign i Hudiksvall.",
    ];
    (contact.items || []).forEach((item) => {
      item.body = "Besök oss i Hudiksvall eller hör av dig för mer information.";
    });
  }
}

repair(document.page?.designSpec);
repair(document.page?.creativeConcept?.execution);
repair(document.page?.creativeBrief?.derived?.concept?.execution);

const saved = await fetch(`${base}/api/projects/${projectId}/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ document }),
}).then((response) => response.json());
if (!saved.ok) throw new Error(`project save failed: ${saved.error || "unknown"}`);
console.log(JSON.stringify({ ok: true, projectId, draftRevision: saved.draftRevision }, null, 2));
