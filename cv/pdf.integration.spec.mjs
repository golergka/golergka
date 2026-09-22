import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { PDF_ERROR_STATUS } from "./constants.mjs";
import { loadContent } from "./content.mjs";

test("generated PDF is one page and contains no LinkedIn links", async ({
  page,
}) => {
  await page.goto("/cv/");

  const status = page.locator("#cv-pdf-status");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Generate PDF" }).click(),
  ]);

  await expect(status).toHaveText("Downloaded · 1 page");
  await expect(status).not.toHaveText(PDF_ERROR_STATUS);
  expect(download.suggestedFilename()).toMatch(/^Max-Yankov-CV-.*\.pdf$/);
  const pdf = fs.readFileSync(await download.path(), "latin1");
  expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
  expect(pdf).not.toContain("linkedin.com");
  expect(pdf).toContain("github.com/golergka");
});

test("selectors retain every configured tag and stack on narrow screens", async ({
  page,
}) => {
  await page.goto("/cv/");
  await expect(page.locator("[data-select-tag]")).toHaveCount(
    loadContent().filters.length,
  );
  expect(await page.locator("[data-select-tag]").evaluateAll((nodes) =>
    nodes.map((node) => node.dataset.selectTag).sort(),
  )).toEqual(loadContent().filters.map(({ id }) => id).sort());

  const experienceTags = page.getByRole("group", { name: "Experience tags" });
  const faqTags = page.getByRole("group", { name: "FAQ tags" });
  const [experienceBox, faqBox] = await Promise.all([
    experienceTags.boundingBox(),
    faqTags.boundingBox(),
  ]);
  expect(experienceBox.width).toBeCloseTo(faqBox.width, 0);

  await page.setViewportSize({ width: 700, height: 900 });
  const [narrowExperienceBox, narrowFaqBox] = await Promise.all([
    experienceTags.boundingBox(),
    faqTags.boundingBox(),
  ]);
  expect(narrowFaqBox.y).toBeGreaterThan(narrowExperienceBox.y);
});

test("related selections expand their matching parent topic", async ({ page }) => {
  await page.goto("/cv/?tags=observability");
  await expect(page.locator("#cv-tags").getByLabel("Braintrust")).toBeVisible();
});

test("nested topic annotations retain every selected topic", async ({ page }) => {
  const coloph = page.locator('article:has(h3:has-text("Coloph"))');
  await page.goto("/cv/?tags=agent-harness");
  await expect(
    coloph.locator('[data-highlight-topics="agent-harness"]').filter({
      hasText: "custom scheduler",
    }),
  ).toHaveText(
    "custom scheduler, orchestration engine and container provision",
  );

  await page.goto("/cv/?tags=docker");
  await expect(
    coloph.locator('[data-highlight-topics="docker"]'),
  ).toHaveText(/container provision/);

  await page.goto("/cv/?tags=docker,kubernetes,agent-harness");
  await expect(
    coloph.locator(
      '[data-highlight-topics="docker,kubernetes,agent-harness"]',
    ),
  ).toHaveText("container provision");
});

test("experience headers and evidence omit company links", async ({ page }) => {
  await page.goto("/cv/");
  await expect(page.locator("#cv-app h3 a")).toHaveCount(0);
  await expect(
    page.locator("#cv-app a[href*='linkedin.com/company']"),
  ).toHaveCount(0);
});

test("selecting a tag retains the Markdown-order preview", async ({ page }) => {
  const hotlinePoints = page.locator(
    'article:has(h3:has-text("Hotline (Gestalt Systems)")) .cv-points > li',
  );
  await page.goto("/cv/?tags=");
  const overview = await hotlinePoints.allTextContents();
  expect(overview).toHaveLength(2);

  await page.goto("/cv/?tags=leadership");
  const selected = await hotlinePoints.allTextContents();
  expect(selected.length).toBeGreaterThanOrEqual(overview.length);
  expect(selected.slice(0, overview.length)).toEqual(overview);
});

test("expanded parent topics stay open after deselecting a child", async ({ page }) => {
  await page.goto("/cv/?tags=braintrust");
  const child = page.locator('[data-topic-id="braintrust"] button');
  await expect(child).toBeVisible();
  await child.click();
  await expect(
    page.locator('[data-topic-id="agents"] > .cv-topic-children'),
  ).toBeVisible();
});

test("Contractor marks its role labels and the pre-2020 group", async ({ page }) => {
  await page.goto("/cv/?tags=contractor");
  await expect(page.locator("#experience-4 .cv-role-name mark")).toHaveText(
    "Contractor",
  );
  await expect(page.locator("#earlier-work-heading .cv-role-name mark")).toHaveText(
    "Contractor",
  );
});

test("group descriptions use the same topic highlights as experiences", async ({
  page,
}) => {
  await page.goto("/cv/?tags=backend");
  await expect(
    page.locator("section:has(#earlier-work-heading) .cv-summary mark").first(),
  ).toHaveText(/game prototypes/);
});

test("experience details expand without moving existing bullets", async ({
  page,
}) => {
  await page.goto("/cv/");
  const details = page.locator("#experience-8 .cv-experience-details");
  const summary = details.locator("summary");
  const preview = page.locator("#experience-8 > .cv-points");
  const firstPreviewPoint = preview.locator("li").first();
  await firstPreviewPoint.evaluate((node) => { window.__cvPreviewPoint = node; });
  await expect(details).not.toHaveAttribute("open", "");
  await expect(preview.locator("li")).toHaveCount(2);
  await summary.click();
  await expect(details).toHaveAttribute("open", "");
  await expect(summary).toHaveText("Show highlights");
  await expect(preview.locator("li")).toHaveCount(2);
  expect(await firstPreviewPoint.evaluate((node) => node === window.__cvPreviewPoint)).toBe(true);
  await expect(page.locator("#earlier-work-details #experience-8")).toHaveCount(1);
  await expect(page.locator("#cv-app > #experience-8")).toHaveCount(0);
  await summary.click();
  await expect(details).not.toHaveAttribute("open", "");
  await expect(summary).toHaveText("Show full experience");
});
