import { expect, test } from "playwright/test";

test("keeps the marketing homepage separate from the usability lab", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /watch real-world personas test every path/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /start testing/i })).toHaveAttribute("href", "/lab");
  await expect(page.getByLabel("Product URL")).toHaveCount(0);
});

test("moves through exclusive setup, persona, and replay scenes", async ({ page }) => {
  test.setTimeout(75_000);
  await page.goto("/lab");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByRole("heading", { name: "Who can use what you built?" })).toBeVisible();
  await expect(page.getByLabel("Product URL")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who should try it?" })).toHaveCount(0);

  await page.getByRole("button", { name: "SaaS Signup" }).click();
  await page.getByRole("button", { name: "Suggest target users" }).click();
  await expect(page.getByRole("heading", { name: /who should try it/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByLabel("Product URL")).toHaveCount(0);
  await expect(page.getByText(/add someone specific/i)).toBeVisible();
  await expect(page.getByLabel("Persona name")).not.toBeVisible();
  await page.getByText(/add someone specific/i).click();
  await expect(page.getByLabel("Persona name")).toBeVisible();
  await expect(page.getByRole("group", { name: "Suggested tester roster" })).toBeVisible();
  await page.getByRole("button", { name: /accept and save personas/i }).click();

  const dispatchResponse = page.waitForResponse(
    (response) => response.url().includes("/api/run-h-agents") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /dispatch 4 testers/i }).click();
  const payload = (await (await dispatchResponse).json()) as { meta?: { mode?: string } };

  expect(payload.meta?.mode).toBe("demo-replay");
  await expect(page.getByRole("heading", { name: /watching/i })).toBeVisible();
  await expect(page.getByLabel("Product URL")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /who should try it/i })).toHaveCount(0);
  await expect(page.getByText("Evidence replay")).toBeVisible();
  await expect(page.getByText(/reviewing aloud/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /propose fix/i })).toBeVisible();
  await expect(page.getByText("Run complete").first()).toBeVisible();
  await expect(page.getByText("View findings")).toBeVisible();

  await page.screenshot({ path: "/tmp/grannysmith-run-flow.png", fullPage: true });
});

test("keeps replay evidence compact on mobile", async ({ page }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lab");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.getByRole("button", { name: "Suggest target users" }).click();
  await page.getByRole("button", { name: /accept and save personas/i }).click();
  await page.getByRole("button", { name: /dispatch 4 testers/i }).click();
  await expect(page.getByText("Evidence replay")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("View findings")).toBeVisible();
  await expect(page.getByText("Human-friendly score")).not.toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});

test("opens human calibration behind an explicit consent gate", async ({ page }) => {
  await page.goto("/calibrate");

  await expect(page.getByRole("heading", { name: /one human session/i })).toBeVisible();
  const start = page.getByRole("button", { name: /start recording/i });
  await expect(start).toBeDisabled();
  await page.getByLabel(/tester consented/i).check();
  await expect(start).toBeDisabled();
  await page.getByLabel(/behavioral research use/i).check();
  await expect(start).toBeEnabled();
});
