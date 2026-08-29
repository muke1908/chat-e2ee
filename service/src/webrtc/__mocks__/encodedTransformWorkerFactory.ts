/**
 * Test stub for the worker factory: the real implementation uses
 * `import.meta.url`, which cannot be compiled to CommonJS by ts-jest.
 */
export function createEncodedTransformWorker(): Worker {
    return new Worker('./encodedTransform.worker.js', { type: 'module' });
}
