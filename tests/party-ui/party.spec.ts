import { test, expect, type Page } from "@playwright/test";
import { catalogue } from "../../lib/party/content";
import { encodeHistory } from "../../lib/party/one-phone";
import { defaults } from "../../lib/party/types";
const backend = process.env.PARTY_UI_BACKEND || "http://localhost:8787";
test("party home fits phones and desktop with clear game descriptions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/party");
    await expect(
      page.getByRole("heading", { name: "What are we playing?" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await expect(
      page.getByRole("button", { name: /Imposter Everyone sees/ }),
    ).toBeVisible();
    expect(await page.getByRole("combobox").count()).toBe(0);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /One phone Add names/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start game", exact: true }),
    ).toBeDisabled();
    expect(await page.getByRole("combobox").count()).toBe(0);
  }
  expect(errors).toEqual([]);
});

for (const adult of [false, true]) {
  test(`one-phone Imposter: ${adult ? "18+" : "general"} round, private handoffs, rematch and reload`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/party");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    for (const name of ["Player One", "Player Two", "Player Three"]) {
      await page.getByRole("textbox", { name: "Player name", exact: true }).fill(name);
      await page.getByRole("button", { name: "Add player", exact: true }).click();
    }
    const difficulty = page.getByRole("group", { name: "Word difficulty", exact: true });
    await expect(difficulty.getByRole("button", { name: "Devious", exact: true })).toHaveAttribute("aria-pressed", "true");
    await difficulty.getByRole("button", { name: "Tricky", exact: true }).click();
    await expect(difficulty.getByRole("button", { name: "Tricky", exact: true })).toHaveAttribute("aria-pressed", "true");
    await difficulty.getByRole("button", { name: "Devious", exact: true }).click();
    if (adult) {
      await page.getByRole("switch", { name: /18\+ mix/ }).check();
      await expect(page.getByRole("button", { name: "Start game", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "After hours", exact: true }).click();
      await page.getByRole("checkbox", { name: "Everyone is 18+ and agrees to adult prompts." }).check();
    }
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    let imposters = 0;
    const secrets: string[] = [];
    for (let i = 0; i < 3; i++) {
      const name = "Player " + ["One", "Two", "Three"][i];
      await expect(page.getByRole("heading", { name: new RegExp(`Pass the phone to.*${name}`) })).toBeVisible();
      await expect(page.locator("[data-private-card]")).toHaveCount(0);
      await page.getByRole("button", { name: `I’m ${name}`, exact: true }).click();
      const confirm = page.getByRole("button", { name: "I’ve seen it. Hide & continue" });
      await expect(confirm).toBeDisabled();
      const hold = page.getByRole("button", { name: "Hold to view your card" });
      await hold.click();
      await expect(page.locator("[data-private-card]")).toHaveCount(0);
      await expect(confirm).toBeDisabled();
      await hold.focus();
      await page.keyboard.down("Space");
      const card = page.locator("[data-private-card]");
      await expect(card).toBeVisible();
      const text = (await card.innerText()).trim();
      if (text === "You’re the imposter") imposters++;
      else secrets.push(text);
      await page.keyboard.up("Space");
      await expect(card).toHaveCount(0);
      await expect(confirm).toBeEnabled();
      await confirm.click();
      await expect(page.getByRole("heading", { name: "Card hidden", exact: true })).toBeVisible();
      await page.getByRole("button", { name: i < 2 ? "Pass to the next person" : "Start discussion", exact: true }).click();
    }
    expect(imposters).toBe(1);
    expect(secrets).toHaveLength(2);
    expect(secrets[0]).toBe(secrets[1]);
    expect(catalogue.find((c) => c.game === "imposter" && c.secret === secrets[0])?.rating).toBe(adult ? "adult" : "general");
    await expect(page.getByRole("heading", { name: "Talk it out", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Choose as a group", exact: true }).click();
    await page.getByRole("button", { name: "Player One", exact: true }).click();
    await page.getByRole("button", { name: "Reveal", exact: true }).click();
    await expect(page.getByText("The secret word was", { exact: false })).toContainText(secrets[0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.getByRole("button", { name: "Next round", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Pass the phone to.*Player One/ })).toBeVisible();
    await page.reload();
    await expect(page.getByText(/previous round was cleared on reload/)).toBeVisible();
    await expect(page.locator("[data-private-card]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const adult of [false, true]) {
  test(`long ${adult ? "adult" : "general"} Imposter words fit a 320px phone`, async ({ page }, testInfo) => {
    const secret = adult ? "Friends-with-benefits contract" : "Secondhand embarrassment";
    const target = catalogue.find((c) => c.secret === secret)!;
    const history = await encodeHistory(catalogue.filter((c) => c.id !== target.id).flatMap((c) => [c.family, ...c.concepts]));
    await page.addInitScript((setup) => {
      localStorage.setItem("party:one:setup", JSON.stringify(setup));
    }, {
      names: ["Player One", "Player Two", "Player Three"],
      settings: { ...defaults, rating: adult ? "adult" : "general", topic: adult ? "after-hours" : "everyday" },
      history,
    });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/party");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    if (adult) await page.getByRole("checkbox", { name: "Everyone is 18+ and agrees to adult prompts." }).check();
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /^I’m Player/ }).click();
      const hold = page.getByRole("button", { name: "Hold to view your card" });
      await hold.scrollIntoViewIfNeeded();
      const box = (await hold.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const card = page.locator("[data-private-card]");
      await expect(card).toBeVisible();
      const found = (await card.innerText()).trim() === secret;
      if (found) {
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
        await page.screenshot({ path: testInfo.outputPath(`party-imposter-${adult ? "adult" : "general"}-320.png`), fullPage: true });
      }
      await page.mouse.up();
      await expect(card).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem("party:one:setup"))).not.toContain(secret);
      if (found) return;
      await page.getByRole("button", { name: "I’ve seen it. Hide & continue" }).click();
      await page.getByRole("button", { name: "Pass to the next person", exact: true }).click();
    }
    throw new Error("No player received the known secret");
  });
}

test("three phones complete adult Imposter with private roles, consent, votes and a hidden display", async ({ browser, request, baseURL }) => {
  const contexts = [];
  const pages: Page[] = [];
  const names = ["Imposter QA One", "Imposter QA Two", "Imposter QA Three"];
  const errors: string[] = [];
  let code = "";
  try {
    for (const name of names) {
      const response = await request.post(`${backend}/rooms${code ? `/${code}/join` : ""}`, { data: { name, adult: false } });
      expect(response.ok()).toBeTruthy();
      const seat = await response.json();
      code = seat.code;
      const ctx = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
      contexts.push(ctx);
      await ctx.addInitScript((seat) => localStorage.setItem(`party:seat:${seat.code}`, JSON.stringify(seat)), seat);
      const page = await ctx.newPage();
      pages.push(page);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`/party/${code}`);
    }
    const host = pages[0];
    await host.getByRole("switch", { name: /18\+ mix/ }).check();
    await host.getByRole("button", { name: "After hours", exact: true }).click();
    const start = host.getByRole("button", { name: "Start round", exact: true });
    await expect(start).toBeDisabled();
    for (const [i, page] of pages.entries()) {
      const consent = page.getByRole("checkbox", { name: "I’m 18+ and happy to play adult rounds." });
      await consent.click();
      await expect(consent).toBeChecked();
      if (i < 2) await expect(start).toBeDisabled();
    }
    await expect(start).toBeEnabled();
    await start.click();
    const displayContext = await browser.newContext({ baseURL });
    contexts.push(displayContext);
    const display = await displayContext.newPage();
    display.on("pageerror", (e) => errors.push(e.message));
    // The link sits in the closed Room options panel, outside the accessibility tree.
    const displayLink = await host.locator('a[href*="?display=1#"]').getAttribute("href");
    expect(displayLink).toMatch(/\?display=1#.+/);
    await display.goto(displayLink!);
    await expect(display.getByText(/An 18\+ round is in progress/)).toBeVisible();
    await expect(display.getByRole("button", { name: "Hold to view your card" })).toHaveCount(0);
    const secrets: string[] = [];
    let imposter = -1;
    for (const [i, page] of pages.entries()) {
      if (i === 1) await page.reload();
      const hold = page.getByRole("button", { name: "Hold to view your card" });
      await expect(page.locator("[data-private-card]")).toHaveCount(0);
      await hold.focus();
      await page.keyboard.down("Space");
      const card = page.locator("[data-private-card]");
      await expect(card).toBeVisible();
      const text = (await card.innerText()).trim();
      if (text === "You’re the imposter") {
        expect(imposter).toBe(-1);
        imposter = i;
      } else secrets.push(text);
      await page.keyboard.up("Space");
      await expect(card).toHaveCount(0);
      await page.getByRole("textbox", { name: "Your clue", exact: true }).fill(["Awkward", "Midnight", "Private"][i]);
      await page.getByRole("button", { name: "Submit answer", exact: true }).click();
    }
    expect(imposter).toBeGreaterThanOrEqual(0);
    expect(secrets).toHaveLength(2);
    expect(secrets[0]).toBe(secrets[1]);
    expect(catalogue.find((c) => c.secret === secrets[0])?.rating).toBe("adult");
    await host.getByRole("button", { name: "Start voting", exact: true }).click();
    for (const [i, page] of pages.entries()) {
      const target = i === imposter ? (i + 1) % 3 : imposter;
      await page.getByRole("button", { name: names[target], exact: true }).click();
      await page.getByRole("button", { name: "Confirm vote", exact: true }).click();
    }
    for (const page of pages) {
      await expect(page.getByText("The imposter was", { exact: true })).toBeVisible();
      await expect(page.getByText("The secret word was", { exact: false })).toContainText(secrets[0]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    }
    await expect(display.getByText("The secret word was", { exact: false })).toHaveCount(0);
    await host.getByRole("button", { name: "Next round", exact: true }).click();
    await expect(pages[1].getByRole("button", { name: "Hold to view your card" })).toBeVisible();
    await pages[1].getByRole("checkbox", { name: "I’m 18+ and happy to play adult rounds." }).click();
    await expect(host.getByText("The secret word was", { exact: false })).toHaveCount(0);
    await expect(host.getByRole("button", { name: "Hold to view your card" })).toHaveCount(0);
    await expect(host.getByRole("heading", { name: /consent|opt.in/i })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((ctx) => ctx.close()));
  }
});

test("three phone players complete a drawing relay with real pointer gestures and reconnect", async ({
  browser,
  request,
  baseURL,
}, testInfo) => {
  const seats = [];
  let code = "";
  const contexts = [];
  const pages: Page[] = [];
  const errors: string[] = [];
  try {
    for (let i = 0; i < 3; i++) {
      const response = await request.post(
        `${backend}/rooms${code ? `/${code}/join` : ""}`,
        {
          data: { name: `Drawing QA ${i + 1}`, adult: false },
        },
      );
      expect(response.ok()).toBeTruthy();
      const seat = await response.json();
      code = seat.code;
      seats.push(seat);
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        baseURL,
      });
      contexts.push(ctx);
      await ctx.addInitScript(
        ({ seat }) =>
          localStorage.setItem(`party:seat:${seat.code}`, JSON.stringify(seat)),
        { seat },
      );
      const page = await ctx.newPage();
      pages.push(page);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`/party/${code}`);
      await expect(
        page.getByRole("link", { name: "Party", exact: true }),
      ).toBeVisible();
    }
    const host = pages[0];
    await host
      .getByRole("button", { name: "Change game", exact: true })
      .click();
    await host
      .getByRole("button", { name: /Drawing Relay Draw, pass/ })
      .click();
    await expect(
      host.getByRole("button", { name: "Start round", exact: true }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "Start round", exact: true })
      .click();
    async function draw(page: Page) {
      const canvas = page.getByRole("img", { name: /Drawing area/ });
      await expect(canvas).toBeVisible();
      await canvas.scrollIntoViewIfNeeded();
      const box = (await canvas.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.25);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.7, {
        steps: 8,
      });
      await page.mouse.move(
        box.x + box.width * 0.8,
        box.y + box.height * 0.25,
        { steps: 8 },
      );
      await page.mouse.up();
      await expect(
        page.getByText("1/70 strokes · drawings stay in this room"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Submit answer" }),
      ).toBeEnabled();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(390);
      await page.getByRole("button", { name: "Submit answer" }).click();
    }
    await host.reload();
    await expect(
      host.getByRole("heading", { name: "Time to draw" }),
    ).toBeVisible();
    await draw(host);
    await draw(pages[1]);
    await draw(pages[2]);
    for (const page of pages) {
      await page
        .getByRole("textbox", { name: /Your caption/ })
        .fill("A surprisingly employable duck");
      await page.getByRole("button", { name: "Submit answer" }).click();
    }
    for (const page of pages) await draw(page);
    for (const page of pages) {
      await expect(
        page.getByRole("heading", { name: "Here’s how it went" }),
      ).toBeVisible();
      await expect(page.getByText(/Round 1 · Drawing Relay/)).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              Object.keys(localStorage).filter((key) =>
                key.startsWith("party:draft:"),
              ).length,
          ),
        )
        .toBe(0);
    }
    await host.screenshot({
      path: testInfo.outputPath("party-drawing-mobile.jpg"),
      fullPage: true,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((ctx) => ctx.close()));
  }
});
