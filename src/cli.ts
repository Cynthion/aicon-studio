#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createServer } from './server.ts';
import { settingsFile } from './settings.ts';

// aicon-studio [project] [--port 54400]: serves the studio over the project folder, the working directory by default;
// a folder without aicon-studio.json starts it without a project, to open or create one in the page.
// Without --port, a taken 54400 moves on to the next free port.

const { values, positionals } = parseArgs({
  options: { port: { type: 'string' } },
  allowPositionals: true
});
const given = values.port !== undefined;
let port = Number(values.port ?? 54400);

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

try {
  const server = createServer(positionals[0] ?? '.', settingsFile());
  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE' && !given) {
      server.listen(++port, '127.0.0.1');
      return;
    }
    fail(e.code === 'EADDRINUSE' ? `port ${port} is in use, pass another --port` : e.message);
  });
  server.on('listening', () => console.log(`Aicon Studio on http://127.0.0.1:${port}`));
  server.listen(port, '127.0.0.1');
} catch (e) {
  fail((e as Error).message);
}
