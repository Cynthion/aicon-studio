import { Injectable } from '@angular/core';

/** A refused request: the status and the server's `error`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** The HTTP API of .documentation/tech/pipeline.md. A failed request throws an `ApiError` and shows nothing. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  async send<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
      method,
      // every write carries the JSON content type, which the server requires
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new ApiError(res.status, json.error ?? res.statusText);
    }
    return json as T;
  }
}
