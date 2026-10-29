import { expect, test, type BrowserContext, type WebSocketRoute } from '@playwright/test';

const backend = process.env.PARTY_UI_BACKEND || 'http://localhost:8787';

for (const code of [4001, 4003, 4004]) {
  test(`terminal close ${code} cannot be undone by online or visibility events`, async ({ page, request }) => {
    const response = await request.post(`${backend}/rooms`, { data: { name: 'Reconnect QA', adult: false } });
    expect(response.ok()).toBeTruthy();
    const seat = await response.json();
    await page.addInitScript(seat => localStorage.setItem(`party:seat:${seat.code}`, JSON.stringify(seat)), seat);
    let connections = 0;
    let connection: WebSocketRoute;
    await page.routeWebSocket('**/rooms/*/ws', route => {
      connections++;
      connection = route;
      route.connectToServer();
    });
    await page.goto(`/party/${seat.code}`);
    await expect(page.getByRole('button', { name: 'Start round', exact: true })).toBeVisible();
    await connection!.close({ code, reason: 'Test terminal close' });
    await expect(page.getByText(code === 4001 ? /This seat is open in another tab/ : code === 4004 ? /This party has ended/ : /This seat is no longer available/)).toBeVisible();
    // The last round must not stay on screen as if it were still reconnecting.
    await expect(page.getByRole('button', { name: 'Start round', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: code === 4001 ? 'Reload' : code === 4004 ? 'Back to games' : 'Leave room', exact: true })).toBeVisible();
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // A normal reconnect begins immediately after those events.
    await page.waitForTimeout(500);
    expect(connections).toBe(1);
  });
}

test('an out-of-date page stops retrying and asks for a reload', async ({ page, request }) => {
  const response = await request.post(`${backend}/rooms`, { data: { name: 'Update QA', adult: false } });
  expect(response.ok()).toBeTruthy();
  const seat = await response.json();
  await page.addInitScript(seat => localStorage.setItem(`party:seat:${seat.code}`, JSON.stringify(seat)), seat);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  let connections = 0;
  await page.routeWebSocket('**/rooms/*/ws', route => {
    connections++;
    const server = route.connectToServer();
    // Simulate a server whose content this bundle doesn't recognise.
    server.onMessage(message => {
      const data = JSON.parse(String(message));
      if (data.type === 'state') data.state.stock = [{ game: 'future-game' }];
      route.send(JSON.stringify(data));
    });
  });
  await page.goto(`/party/${seat.code}`);
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeVisible({ timeout: 15000 });
  expect(connections).toBe(3);
  expect(errors).toEqual([]);
});

test('a silently stalled socket reconnects and waits for its own authenticated snapshot', async ({ page, request, browser, baseURL }) => {
  let room = '';
  const seats = [];
  for (const name of ['Heartbeat QA', 'Friend One', 'Friend Two']) {
    const response = await request.post(`${backend}/rooms${room ? `/${room}/join` : ''}`, { data: { name, adult: false } });
    expect(response.ok()).toBeTruthy();
    const seat = await response.json();
    room = seat.code;
    seats.push(seat);
  }
  await page.clock.install();
  await page.addInitScript(seat => localStorage.setItem(`party:seat:${seat.code}`, JSON.stringify(seat)), seats[0]);
  let stalled = false;
  let connections = 0;
  let replacement: WebSocketRoute | undefined;
  let replacementState: string | undefined;
  await page.routeWebSocket('**/rooms/*/ws', route => {
    connections++;
    const number = connections;
    const server = route.connectToServer();
    route.onMessage(message => {
      if (message !== 'ping' || !stalled) server.send(message);
    });
    server.onMessage(message => {
      if (number === 1 && !stalled) route.send(message);
      if (number > 1) {
        replacement = route;
        replacementState = String(message);
      }
    });
  });
  const contexts: BrowserContext[] = [];
  try {
    for (const seat of seats.slice(1)) {
      const context = await browser.newContext({ baseURL });
      contexts.push(context);
      await context.addInitScript(seat => localStorage.setItem(`party:seat:${seat.code}`, JSON.stringify(seat)), seat);
      const peer = await context.newPage();
      await peer.goto(`/party/${room}`);
    }
    await page.goto(`/party/${room}`);
    const start = page.getByRole('button', { name: 'Start round', exact: true });
    await expect(start).toBeEnabled();
    stalled = true;
    await page.clock.fastForward(76000);
    await expect.poll(() => connections).toBe(2);
    await expect(start).toBeDisabled();
    await expect.poll(() => replacementState).toBeTruthy();
    replacement!.send(replacementState!);
    stalled = false;
    await expect(start).toBeEnabled();
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});

test('a rejected answer keeps its draft through a reload', async ({ page, request, browser, baseURL }) => {
  const contexts: BrowserContext[] = [];
  let code = '';
  try {
    for (const [i, name] of ['Draft Host', 'Draft Friend One', 'Draft Friend Two'].entries()) {
      const response = await request.post(`${backend}/rooms${code ? `/${code}/join` : ''}`, { data: { name } });
      expect(response.ok()).toBeTruthy();
      const seat = await response.json();
      code = seat.code;
      const context = i === 0 ? page.context() : await browser.newContext({ baseURL });
      if (i > 0) contexts.push(context);
      await context.addInitScript(seat => localStorage.setItem(`party:seat:${seat.code}`, JSON.stringify(seat)), seat);
      const phone = i === 0 ? page : await context.newPage();
      await phone.goto(`/party/${code}`);
    }
    await page.getByRole('button', { name: 'Change game', exact: true }).click();
    await page.getByRole('button', { name: /Same Brain Answer in/ }).click();
    await page.getByRole('button', { name: 'Start round', exact: true }).click();
    const answer = page.getByRole('textbox', { name: 'Your answer', exact: true });
    await answer.fill('three whole words');
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Same Brain: one or two words.' })).toBeVisible();
    await page.reload();
    await expect(answer).toHaveValue('three whole words');
    await answer.fill('toast');
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Answer submitted', exact: true })).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('party:draft:')))).toEqual([]);
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});
