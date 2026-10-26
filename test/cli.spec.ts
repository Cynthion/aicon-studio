import { spawn, type ChildProcess } from 'node:child_process';
import * as net from 'node:net';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXAMPLE, request, tmpDir } from './helpers.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CLI = path.join(ROOT, 'src', 'cli.ts');

const freePort = (): Promise<number> =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

/** Runs the CLI until it prints its URL or exits. */
const studio = (
  args: string[],
  cwd: string
): Promise<{ child: ChildProcess; stdout: string; stderr: string; code: number | null }> =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd });
    let stdout = '';
    let stderr = '';
    const done = (code: number | null): void => resolve({ child, stdout, stderr, code });
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.includes('http://')) {
        done(null);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('exit', done);
  });

const stop = (child: ChildProcess): Promise<void> =>
  new Promise((resolve) => {
    if (child.exitCode !== null) {
      return resolve();
    }
    child.on('exit', () => resolve());
    child.kill();
  });

describe('aicon-studio', () => {
  it('serves the project on the given port', async () => {
    const port = await freePort();
    const { child, stdout } = await studio(['example', '--port', String(port)], ROOT);
    const reply = await request(port, 'GET', '/api/state').finally(() => stop(child));

    expect([stdout.trim(), reply.status]).toEqual([`Aicon Studio on http://127.0.0.1:${port}`, 200]);
  });

  it('runs the working directory when no folder is given', async () => {
    const port = await freePort();
    const { child } = await studio(['--port', String(port)], EXAMPLE);
    const reply = await request(port, 'GET', '/api/state').finally(() => stop(child));

    expect((reply.json['config'] as { target: string }).target).toBe('./icons');
  });

  it('fails clearly without aicon-studio.json', async () => {
    const dir = tmpDir();
    const { code, stderr } = await studio([dir, '--port', String(await freePort())], ROOT);

    expect([code, stderr.trim()]).toEqual([1, `no aicon-studio.json in ${dir}`]);
  });

  it('fails clearly when the port is in use', async () => {
    const port = await freePort();
    const holder = net.createServer();
    await new Promise<void>((resolve) => holder.listen(port, '127.0.0.1', () => resolve()));
    const { code, stderr } = await studio(['example', '--port', String(port)], ROOT).finally(() => holder.close());

    expect([code, stderr.trim()]).toEqual([1, `port ${port} is in use, pass --port`]);
  });
});
