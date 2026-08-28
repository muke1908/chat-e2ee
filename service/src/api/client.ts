import { configContext } from '../configContext';

export type ApiError = Error & {
  status: number
}

/**
 * Generic typed wrapper around `fetch()` for the chat-e2ee REST API.
 *
 * `TResponse` should be declared by each call site to the JSON shape it
 * expects back (see `public/types.ts`); `TBody` defaults to `unknown` so
 * request bodies still get basic type-checking without requiring every
 * caller to declare one.
 */
const makeRequest = async <TResponse, TBody = unknown>(
  url: string,
  { method = 'GET', body }: { method: string, body?: TBody }
): Promise<TResponse> => {
  const baseUri = configContext().baseUrl;
  const res = await window.fetch(`${baseUri}/api/${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!res.ok) {
    const json = res.headers.get('Content-Type')?.includes('application/json')
      ? await res.json()
      : await res.text();

    const err = new Error(json.message || json.error || JSON.stringify(json)) as ApiError;
    err.status = res.status;

    throw err;
  }

  return await res.json() as TResponse;
};

export default makeRequest;
