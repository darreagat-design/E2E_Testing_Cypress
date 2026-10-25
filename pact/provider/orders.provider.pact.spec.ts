import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { Verifier } from '@pact-foundation/pact';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const providerPort = 3001;
const providerUrl = `http://127.0.0.1:${providerPort}`;
const apiDist = resolve('apps/api/dist/index.js');
const pactFile = resolve('pacts/CafeCentralWeb-CafeCentralApi.json');
const databasePath = resolve('data/cafe-central-pact.sqlite');

let providerProcess: ChildProcess | undefined;
let providerOutput = '';

function assertPortAvailable(port: number): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => {
      probe.close((error) => (error ? reject(error) : resolvePromise()));
    });
  });
}

async function waitForProvider(): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (providerProcess?.exitCode !== null && providerProcess?.exitCode !== undefined) {
      throw new Error(`La API de testing terminó antes de iniciar.\n${providerOutput}`);
    }
    try {
      const response = await fetch(`${providerUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Keep polling until the real API responds or the startup deadline expires.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`La API no respondió dentro del tiempo límite.\n${providerOutput}`);
}

async function resetProviderDatabase(): Promise<void> {
  const response = await fetch(`${providerUrl}/api/test/reset`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`El reset de testing respondió HTTP ${response.status}.`);
  }
}

const stateHandlers = {
  'an order with id 1 exists': async () => {
    await resetProviderDatabase();
    const response = await fetch(`${providerUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: 1, quantity: 2 }] }),
    });
    if (!response.ok) {
      throw new Error(`No se pudo crear la orden del estado Pact (HTTP ${response.status}).`);
    }
    const order = (await response.json()) as { id: number; total: number };
    if (order.id !== 1 || order.total !== 30) {
      throw new Error(`El estado Pact esperaba la orden 1 por Q30 y recibió ${JSON.stringify(order)}.`);
    }
  },
  'an order with id 999 does not exist': async () => {
    await resetProviderDatabase();
    const response = await fetch(`${providerUrl}/api/orders/999`);
    if (response.status !== 404) {
      throw new Error(`El estado Pact esperaba que la orden 999 devolviera 404 y recibió ${response.status}.`);
    }
  },
};

describe('CafeCentralApi provider contract verification', () => {
  beforeAll(async () => {
    await assertPortAvailable(providerPort);
    providerProcess = spawn(process.execPath, [apiDist], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'testing',
        DATABASE_PATH: databasePath,
        PORT: String(providerPort),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    providerProcess.stdout?.on('data', (chunk: Buffer) => {
      providerOutput += chunk.toString();
    });
    providerProcess.stderr?.on('data', (chunk: Buffer) => {
      providerOutput += chunk.toString();
    });
    await waitForProvider();
  }, 20_000);

  afterAll(async () => {
    if (providerProcess && providerProcess.exitCode === null) {
      providerProcess.kill();
      await Promise.race([
        once(providerProcess, 'exit'),
        new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000)),
      ]);
    }
  });

  it('verifies the generated consumer contract against the real API', async () => {
    const verifier = new Verifier({
      provider: 'CafeCentralApi',
      providerBaseUrl: providerUrl,
      providerVersion: 'local',
      pactUrls: [pactFile],
      publishVerificationResult: false,
      stateHandlers,
      logLevel: 'info',
    });

    const result = await verifier.verifyProvider();
    console.info(result);
    expect(result).toBeTruthy();
  }, 120_000);
});
