import { render } from "preact";
import { jsPDF } from "jspdf";
import { App } from "./app.jsx";
import { createCvPdf, pdfBlocks } from "./pdf.mjs";

export async function downloadCvPdf(data, selected) {
  const root = document.createElement("main");
  try {
    render(<App data={data} exportSelection={selected} />, root);
    const pdf = createCvPdf(
      jsPDF,
      pdfBlocks(root),
      `${data.profile.name} — CV`,
    );
    pdf.save(`Max-Yankov-CV-${[...selected].join("-") || "overview"}.pdf`);
    return pdf.getNumberOfPages();
  } finally {
    render(null, root);
  }
}

