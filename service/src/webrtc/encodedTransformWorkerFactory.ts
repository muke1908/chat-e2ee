/**
 * Creates the encoded-transform worker.
 *
 * The worker URL is resolved against this module (`import.meta.url`) rather
 * than the host page: a bare relative specifier such as
 * `'./encodedTransform.worker.js'` resolves against the document URL, so on a
 * route like `/chat/<id>` the browser requests a file that does not exist and
 * the transform silently drops every media frame.
 *
 * The `new URL(..., import.meta.url)` call must stay inline so bundlers can
 * detect it and emit/rewrite the worker chunk. Isolated in its own module
 * because `import.meta` cannot be compiled to CommonJS for the unit tests.
 */
export function createEncodedTransformWorker(): Worker {
    return new Worker(new URL('./encodedTransform.worker.ts', import.meta.url), { type: 'module' });
}
