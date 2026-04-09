export {};

declare global {
    /**
     * Shim to support generic Uint8Array<TBuffer> used in cryptoAES.ts
     * while working in environments with older TypeScript definitions.
     */
    interface Uint8Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> extends ArrayBufferView<TArrayBuffer> {
        readonly [Symbol.toStringTag]: "Uint8Array";
        readonly buffer: TArrayBuffer;
        readonly length: number;
        readonly byteLength: number;
        readonly byteOffset: number;
        [n: number]: number;
    }
}
