import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { FIXTURES } from './helpers.ts';

/** A fixture PNG per subject, answered to a prompt that contains the subject. */
export const PNGS: Record<string, string> = {
  'a house': path.join(FIXTURES, 'png', 'home.png'),
  'a magnifying glass': path.join(FIXTURES, 'png', 'search.png'),
  'a chevron pointing right': path.join(FIXTURES, 'png', 'chevron-right.png')
};

export interface StubRequest {
  endpoint: 'generations' | 'edits' | 'chat';
  headers: http.IncomingHttpHeaders;
  body: Record<string, unknown>;
  /** Bytes of the `image[]` part of an edit. */
  image: number;
  at: number;
}
export interface Answer {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}
export interface Stub {
  /** The OpenAI-compatible base URL, ending in `/v1`. */
  url: string;
  requests: StubRequest[];
  /** Answers to the next image requests, one each, before the fixture PNGs. */
  answers: Answer[];
  /** The answer to every image request, instead of the fixture PNGs. */
  always?: Answer;
  /** Milliseconds each image request waits before it is answered. */
  delayMs: number;
  chatText: string;
  close: () => Promise<void>;
}

const parseMultipart = (raw: Buffer, contentType: string): { fields: Record<string, string>; image: number } => {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1] ?? '';
  const fields: Record<string, string> = {};
  let image = 0;
  for (const part of raw.toString('latin1').split(`--${boundary}`).slice(1, -1)) {
    const [head = '', ...rest] = part.split('\r\n\r\n');
    // multipart encoding turns every newline of a text field into CRLF
    const content = rest.join('\r\n\r\n').replace(/\r\n$/, '').replace(/\r\n/g, '\n');
    const name = /name="([^"]+)"/.exec(head)?.[1] ?? '';
    if (name === 'image[]') {
      image = Buffer.byteLength(content, 'latin1');
    } else {
      fields[name] = content;
    }
  }
  return { fields, image };
};

/** A fake OpenAI-compatible endpoint, which records every request. */
export const startStub = (pngs: Record<string, string> = PNGS): Promise<Stub> =>
  new Promise((resolve) => {
    const stub: Stub = {
      url: '',
      requests: [],
      answers: [],
      delayMs: 0,
      chatText: 'a house with a door',
      close: () => new Promise((done) => server.close(() => done()))
    };
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const raw = Buffer.concat(chunks);
        const send = ({ status, body, headers = {} }: Answer): void => {
          res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
          res.end(JSON.stringify(body));
        };
        const type = String(req.headers['content-type'] ?? '');
        const endpoint = req.url?.endsWith('/images/generations')
          ? 'generations'
          : req.url?.endsWith('/images/edits')
            ? 'edits'
            : 'chat';
        const { fields, image } = type.startsWith('multipart/')
          ? parseMultipart(raw, type)
          : { fields: JSON.parse(raw.toString('utf8') || '{}') as Record<string, unknown>, image: 0 };
        stub.requests.push({ endpoint, headers: req.headers, body: fields, image, at: Date.now() });
        if (endpoint === 'chat') {
          return send({ status: 200, body: { choices: [{ message: { content: stub.chatText } }] } });
        }
        const answer = (): Answer => {
          const queued = stub.always ?? stub.answers.shift();
          if (queued) {
            return queued;
          }
          const prompt = typeof fields['prompt'] === 'string' ? fields['prompt'] : '';
          const subject = Object.keys(pngs).find((s) => prompt.includes(s));
          return subject
            ? { status: 200, body: { data: [{ b64_json: fs.readFileSync(pngs[subject]).toString('base64') }] } }
            : { status: 400, body: { error: { code: 'unknown_subject', message: prompt.slice(0, 80) } } };
        };
        setTimeout(() => send(answer()), stub.delayMs);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      stub.url = `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`;
      resolve(stub);
    });
  });
