#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolveProject } from './project.ts';
import { createServer } from './server.ts';
import { settingsFile } from './settings.ts';

// aicon-studio [project] [--port 54400]: serves the studio over the project folder, the working directory by default.

const { values, positionals } = parseArgs({
  options: { port: { type: 'string', default: '54400' } },
  allowPositionals: true
});
const port = Number(values.port);

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

try {
  const server = createServer(resolveProject(positionals[0] ?? '.'), settingsFile());
  server.on('error', (e: NodeJS.ErrnoException) =>
    fail(e.code === 'EADDRINUSE' ? `port ${port} is in use, pass --port` : e.message)
  );
  server.listen(port, '127.0.0.1', () => console.log(`Aicon Studio on http://127.0.0.1:${port}`));
} catch (e) {
  fail((e as Error).message);
}
