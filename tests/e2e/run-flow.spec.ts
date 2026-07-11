import { expect, test } from "playwright/test";

test("runs the website-to-score fallback flow", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const workflow = page.getByRole("list", { name: "Usability test workflow" });
  await expect(workflow).toContainText("Add website");
  await expect(workflow).toContainText("Generate tasks");
  await expect(workflow).toContainText("Run agents");
  await expect(workflow).toContainText("Collect evidence");
  await expect(workflow).toContainText("What next");

  await page.getByRole("button", { name: "SaaS Signup" }).click();
  await page.getByRole("button", { name: "Generate Panel" }).click();
  await expect(page.getByRole("heading", { name: "Panel ready" })).toBeVisible();
  await expect(page.getByText("Task", { exact: true }).first()).toBeVisible();

  const dispatchResponse = page.waitForResponse(
    (response) => response.url().includes("/api/run-h-agents") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Dispatch 4 Grandmas" }).click();
  const payload = (await (await dispatchResponse).json()) as { meta?: { mode?: string } };

  expect(payload.meta?.mode).toBe("demo-replay");
  await expect(page.getByText(/Replay fallback loaded/)).toBeVisible();
  await expect(page.getByText("Human-Friendly Score is final", { exact: false })).toBeVisible();
  await expect(page.getByText("Fix the top blocker, then rerun")).toBeVisible();
  await expect(page.getByText(/glowing numbered markers are the heatmap/i)).toBeVisible();

  await page.screenshot({ path: "/tmp/grannysmith-run-flow.png", fullPage: true });
});
