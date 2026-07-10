// Usage: node scripts/verify-cpu-layer.mjs <scrubFraction 0-1> <outputName>
// Points at the already-running dev server (localhost:5173 by default —
// override with CPU_ANIM_PORT=5174 if that's what's actually listening).
// Does NOT start, stop, or restart any server.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('scripts/screenshots', { recursive: true });

const scrubFraction = Number(process.argv[2] ?? '0.85');
const outputName = process.argv[3] ?? 'verify';
const port = process.env.CPU_ANIM_PORT ?? '5173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(err.message));

await page.goto(`http://localhost:${port}/cpuanimation`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const scrubber = await page.$('div.pointer-events-auto.flex.items-center.justify-between.px-4.h-8');
if (!scrubber) {
  console.error('Could not find the timeline scrubber element — page structure may have changed.');
  process.exit(1);
}
const box = await scrubber.boundingBox();
const targetX = box.x + 16 + scrubFraction * (box.width - 32);
const targetY = box.y + box.height / 2;
await page.mouse.move(box.x + box.width / 2, targetY);
await page.mouse.down();
await page.mouse.move(targetX, targetY, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(1800);

await page.screenshot({ path: `scripts/screenshots/${outputName}_a.png` });
await page.waitForTimeout(600);
await page.screenshot({ path: `scripts/screenshots/${outputName}_b.png` });

if (consoleErrors.length > 0) {
  console.error('CONSOLE ERRORS:', consoleErrors);
  process.exitCode = 1;
} else {
  console.log(`OK — no console errors. Screenshots: scripts/screenshots/${outputName}_a.png and _b.png (600ms apart — open both to visually confirm motion happened between them).`);
}

await browser.close();
