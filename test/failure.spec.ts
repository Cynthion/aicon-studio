import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { type Failure, newJob, readSet, startRun, type Job } from '../src/pipeline.ts';
import type { Project } from '../src/project.ts';
import type { Settings } from '../src/settings.ts';
import { close, ICONS, listen, makeProject, SHARP_PROMPT, SOFT_PROMPT } from './helpers.ts';
import { type Answer, startStub, type Stub } from './stub.ts';

const HOME_ONLY = [{ stem: 'home', subject: 'a house' }];
const settingsAt = (baseUrl: string): Settings => ({
  baseUrl,
  apiKey: 'test-key',
  imageModel: 'img-model',
  describeModel: 'chat-model'
});

/** What a run of one icon leaves: the failure of its set, the halt of its job, the requests, and whether it was drawn. */
interface Outcome {
  failure?: Failure;
  halted?: Failure;
  requests: number;
  drawn: boolean;
  failed: string[];
}

/** A base URL nothing listens on; fetch refuses low ports such as 1 without trying them. */
const closedPort = async (): Promise<string> => {
  const server = http.createServer();
  const port = await listen(server);
  await close(server);
  return `http://127.0.0.1:${port}/v1`;
};

const until = async (ready: () => boolean): Promise<void> => {
  while (!ready()) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

/** A run of one icon at `baseUrl`, with `job`, and what it left. */
const runAt = async (baseUrl: string, job: Job = newJob(), stub?: Stub): Promise<Outcome> => {
  const { project } = makeProject({ icons: HOME_ONLY, targetFiles: [] });
  await startRun(project, settingsAt(baseUrl), ['soft'], 'medium', job);
  const set = job.sets[0];
  const info = readSet(project, set);
  return {
    failure: info.failures['home'],
    halted: job.halted,
    requests: stub?.requests.length ?? 0,
    drawn: fs.existsSync(path.join(project.runs, ...set.split('/'), 'home.svg')),
    failed: info.failed
  };
};

/** A run of one icon whose image requests get `answers` first, then `always`, or else the fixture PNG. */
const answered = async (answers: Answer[], always?: Answer): Promise<Outcome> => {
  const stub = await startStub();
  stub.answers.push(...answers);
  stub.always = always;
  const outcome = await runAt(stub.url, newJob(), stub);
  await stub.close();
  return outcome;
};

const rateLimit = (seconds: number, body: unknown = { error: { message: 'slow down' } }): Answer => ({
  status: 429,
  headers: { 'retry-after': String(seconds) },
  body
});

// each case waits out real retry delays, so they run side by side, with a stub of their own
describe.concurrent('failed drawings', { timeout: 90_000 }, () => {
  it('waits out every rate limit, without an attempt limit', async () => {
    const { drawn, requests, failure } = await answered(Array.from({ length: 6 }, () => rateLimit(1)));

    expect([drawn, requests, failure]).toEqual([true, 7, undefined]);
  });

  it('pauses every drawing of the job on a rate limit', async () => {
    const stub = await startStub();
    stub.answers.push(rateLimit(3));
    const drawn = ICONS.filter((icon) => 'subject' in icon);
    const { project }: { project: Project } = makeProject({
      icons: drawn,
      styles: { soft: SOFT_PROMPT, sharp: SHARP_PROMPT },
      targetFiles: []
    });
    await startRun(project, settingsAt(stub.url), ['soft', 'sharp'], 'medium', newJob());
    await stub.close();
    const [first, ...rest] = stub.requests;

    expect(rest.slice(3).map((request) => request.at - first.at >= 4000)).toEqual([true, true, true]);
  });

  it('takes a rate limit that links a quota increase for a rate limit', async () => {
    const message =
      'Please retry after 1 second. Please go here: https://aka.ms/oai/quotaincrease to increase the limit.';
    const { drawn } = await answered([rateLimit(1, { code: 'RateLimitReached', message })]);

    expect(drawn).toBe(true);
  });

  it('ends a rate-limit pause at a stop', async () => {
    const stub = await startStub();
    stub.answers.push(rateLimit(30));
    const job = newJob();
    const running = runAt(stub.url, job, stub);
    await until(() => stub.requests.length === 1);
    await new Promise((resolve) => setTimeout(resolve, 200));
    job.stopped = true;
    const stoppedAt = Date.now();
    // the drawing gives up; closing Chromium afterwards is no part of the pause
    await until(() => !job.drawing.length);
    const ended = Date.now() - stoppedAt;
    const { failure, failed } = await running;
    await stub.close();

    expect([ended < 2000, failure, failed]).toEqual([true, undefined, []]);
  });

  it('stops the job on a quota error', async () => {
    const answer = rateLimit(1, { error: { code: 'insufficient_quota', message: 'no credit' } });
    const { requests, halted, failure, failed } = await answered([], answer);

    expect([requests, halted, failure, failed]).toEqual([1, { cause: 'quota', message: 'no credit' }, undefined, []]);
  });

  it('stops the job on a payment error', async () => {
    const { halted } = await answered([], { status: 402, body: { error: { message: 'pay' } } });

    expect(halted).toEqual({ cause: 'quota', message: 'pay' });
  });

  it.each([401, 403, 404])('stops the job when the endpoint refuses the settings with %i', async (status) => {
    const { requests, halted } = await answered([], { status, body: { error: { message: 'refused' } } });

    expect([requests, halted]).toEqual([1, { cause: 'settings', message: 'refused' }]);
  });

  it('stops the job on refused settings even when the message names a content policy', async () => {
    const message = 'Access denied by the content policy of your organization';
    const { requests, halted } = await answered([], { status: 403, body: { error: { message } } });

    expect([requests, halted]).toEqual([1, { cause: 'settings', message }]);
  });

  it('stops the job when the endpoint stays unavailable', async () => {
    const { requests, halted } = await answered([], { status: 500, body: {} });

    expect([requests, halted]).toEqual([5, { cause: 'unavailable', message: '500 {}' }]);
  });

  it('stops the job when the endpoint cannot be reached', async () => {
    const { halted } = await runAt(await closedPort());

    expect(halted).toEqual({ cause: 'unavailable', message: 'ECONNREFUSED' });
  });

  it.each(['moderation_blocked', 'content_policy_violation'])(
    'fails the icon after a second safety block, by its code %s',
    async (code) => {
      const { requests, failure } = await answered([], { status: 400, body: { error: { code, message: 'refused' } } });

      expect([requests, failure]).toEqual([2, { cause: 'safety', message: 'refused' }]);
    }
  );

  it('names a safety block by its message', async () => {
    const message = 'Your request was rejected by the safety system.';
    const { failure } = await answered([], { status: 400, body: { error: { code: 'x', message } } });

    expect(failure).toEqual({ cause: 'safety', message });
  });

  it('fails the icon at once on another client error', async () => {
    const { requests, failure } = await answered([], {
      status: 400,
      body: { error: { code: 'invalid_prompt', message: 'bad' } }
    });

    expect([requests, failure]).toEqual([1, { cause: 'other', message: 'bad' }]);
  });

  it('fails the icon at once on an answer without an image', async () => {
    const { requests, failure } = await answered([], { status: 200, body: { data: [{}] } });

    expect([requests, failure]).toEqual([1, { cause: 'other', message: '200 {"data":[{}]}' }]);
  });

  it('reads an error at the top level of the answer', async () => {
    const { failure } = await answered([], { status: 400, body: { code: 'invalid_prompt', message: 'bad' } });

    expect(failure).toEqual({ cause: 'other', message: 'bad' });
  });

  it('stays readable without a message', async () => {
    const { failure } = await answered([], { status: 400, body: {} });

    expect(failure).toEqual({ cause: 'other', message: '400 {}' });
  });
});
