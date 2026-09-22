// Text-based PDF layout: the same serif hierarchy, rules, links and highlights
// as the HTML. No screenshot rasterization or server-side generation.
export function pdfBlocks(root) {
  function runs(node, style = {}) {
    if (node.nodeType === 3)
      return [{ text: node.textContent.replace(/\s+/g, " "), ...style }];
    if (node.nodeType !== 1 || node.classList.contains("cv-sr-only")) return [];
    if (node.matches('a[href*="linkedin.com"]')) return [];
    const next = { ...style };
    if (node.matches("h1,h2,h3,strong,b")) next.bold = true;
    if (node.matches(".cv-role-name,.cv-role-separator")) next.bold = false;
    if (node.matches("mark,.cv-topic-mark")) next.mark = true;
    if (node.matches("a")) next.href = node.href;
    return [...node.childNodes].flatMap((child) => runs(child, next));
  }
  function block(node, size, after = 2, extra = {}) {
    return { runs: runs(node), size, after, ...extra };
  }
  const groups = [];
  groups.push([
    block(root.querySelector("h1"), 18, 2),
    block(root.querySelector(".cv-headline"), 11, 3),
    block(root.querySelector(".cv-global-lead"), 9, 3),
    block(root.querySelector(".cv-links"), 8, 7),
    block(root.querySelector(".cv-generation-note"), 8, 2, { color: 85 }),
    block(root.querySelector(".cv-expertise"), 8, 2),
  ]);
  groups.push([block(root.querySelector(".cv-section-heading h2"), 12, 5)]);
  for (const entry of root.querySelector("#cv-app").children) {
    const blocks = [];
    for (const child of entry.children) {
      if (child.matches("h3")) blocks.push(block(child, 10, 2));
      else if (child.matches(".cv-role-meta")) {
        blocks
          .at(-1)
          .runs.push(
            { text: "  ·  ", color: 85 },
            ...runs(child, { color: 85 }),
          );
      } else if (child.matches(".cv-summary")) blocks.push(block(child, 9, 2));
      else if (child.matches("ul")) {
        for (const li of child.children)
          blocks.push(block(li, 9, 1, { bullet: true }));
      } else if (child.matches(".cv-evidence")) blocks.push(block(child, 8, 2));
    }
    blocks.push({ rule: true, after: 5 });
    groups.push(blocks);
  }
  const credentials = [
    ...root.querySelectorAll(".cv-credential-section"),
  ].flatMap((section) => [
    block(section.querySelector("h2"), 10, 2),
    block(section.querySelector("p"), 8, 4),
  ]);
  if (credentials.length) groups.push(credentials);
  return groups;
}

export function createCvPdf(jsPDF, groups, title) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  pdf.setProperties({
    title,
    author: "Max Yankov",
    subject: "Selected experience",
    creator: "golergka.com CV",
  });
  const margin = 26,
    width = pdf.internal.pageSize.getWidth() - margin * 2;
  const bottom = pdf.internal.pageSize.getHeight() - margin;
  let y = margin;

  function wrap(block) {
    const lines = [[]];
    let used = 0;
    const available = width - (block.bullet ? 13 : 0);
    for (const run of block.runs) {
      pdf.setFont("times", run.bold ? "bold" : "normal");
      pdf.setFontSize(block.size);
      for (let text of run.text.split(/(\s+)/).filter(Boolean)) {
        if (!used && !text.trim()) continue;
        // Long URLs still wrap within the page, retaining their link target.
        while (text) {
          let part = text;
          if (pdf.getTextWidth(part) > available) {
            while (pdf.getTextWidth(part) > available) part = part.slice(0, -1);
          }
          const length = pdf.getTextWidth(part);
          if (used && used + length > available) {
            lines.push([]);
            used = 0;
          }
          if (used || part.trim()) {
            lines.at(-1).push({ ...run, text: part, width: length });
            used += length;
          }
          text = text.slice(part.length);
        }
      }
    }
    return lines.filter((line) => line.length);
  }

  const leadingRatio = 1.15;
  const blockHeight = (block) =>
    (block.rule ? 3 : block.lines.length * block.size * leadingRatio) +
    block.after;
  const layout = (scale) =>
    groups.map((group) =>
      group.map((source) => {
        const block = {
          ...source,
          size: source.size * scale,
          after: source.after * scale,
        };
        return { ...block, lines: block.rule ? [] : wrap(block) };
      }),
    );
  // Treat the existing type scale as the floor, then maximize it for one page.
  let laidOutGroups = layout(1);
  const fitsOnePage = (groups) =>
    groups.flat().reduce((sum, block) => sum + blockHeight(block), 0) <=
    bottom - margin;
  if (fitsOnePage(laidOutGroups)) {
    let lower = 1,
      upper = 2;
    while (fitsOnePage(layout(upper))) {
      lower = upper;
      upper *= 2;
    }
    for (let iteration = 0; iteration < 12; iteration++) {
      const middle = (lower + upper) / 2;
      if (fitsOnePage(layout(middle))) lower = middle;
      else upper = middle;
    }
    laidOutGroups = layout(lower);
  }
  for (const laidOut of laidOutGroups) {
    const height = laidOut.reduce((sum, block) => sum + blockHeight(block), 0);
    if (y > margin && y + height > bottom && height <= bottom - margin) {
      pdf.addPage();
      y = margin;
    }
    for (const block of laidOut) {
      if (block.rule) {
        y += 3;
        pdf.setDrawColor(205);
        pdf.setLineWidth(0.5);
        if (y < bottom) pdf.line(margin, y, margin + width, y);
      } else {
        const leading = block.size * leadingRatio;
        for (let i = 0; i < block.lines.length; i++) {
          if (y + leading > bottom) {
            pdf.addPage();
            y = margin;
          }
          let x = margin + (block.bullet ? 13 : 0);
          if (block.bullet && i === 0) {
            pdf.setFont("times", "normal");
            pdf.setFontSize(block.size);
            pdf.setTextColor(0);
            pdf.text("•", margin, y + block.size);
          }
          for (const run of block.lines[i]) {
            pdf.setFont("times", run.bold ? "bold" : "normal");
            pdf.setFontSize(block.size);
            if (run.mark) {
              pdf.setFillColor(255, 240, 166);
              pdf.rect(x, y + 1, run.width, block.size + 2, "F");
            }
            if (run.href) pdf.setTextColor(0, 0, 180);
            else pdf.setTextColor(run.color ?? block.color ?? 0);
            pdf.text(run.text, x, y + block.size);
            if (run.href) pdf.link(x, y, run.width, leading, { url: run.href });
            x += run.width;
          }
          y += leading;
        }
      }
      y += block.after;
    }
  }
  for (
    let page = 1;
    pdf.getNumberOfPages() > 1 && page <= pdf.getNumberOfPages();
    page++
  ) {
    pdf.setPage(page);
    pdf.setFont("times", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110);
    pdf.text(
      `${page} / ${pdf.getNumberOfPages()}`,
      margin + width,
      bottom + 16,
      { align: "right" },
    );
  }
  return pdf;
}
