import { expect, test } from '@playwright/test';

test('stage editor hover does not resize the grid', async ({ page }) => {
  await page.goto('/index.html');
  const grid = page.locator('#stageGrid');
  await expect(grid).toBeVisible();

  const bottomCell = page.locator('.stage-cell[data-x="0"][data-y="19"]');
  await expect(bottomCell).toBeVisible();

  const before = await grid.evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    cellSize: getComputedStyle(element).getPropertyValue('--cell-size')
  }));

  await bottomCell.hover();

  const after = await grid.evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    cellSize: getComputedStyle(element).getPropertyValue('--cell-size')
  }));

  expect(after).toEqual(before);
});

test('core calculation smoke test is available from the UI', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(() => {
    if (!window.FEGModules || !window.FEGModules.StageCalculator) return false;
    const calc = window.FEGModules.StageCalculator;
    return calc.calculateConnectedComponents([{ x: 0, y: 0 }, { x: 1, y: 1 }]) === 2;
  });
  expect(result).toBe(true);
});
