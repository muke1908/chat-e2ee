import { ReplayGuard } from './replayGuard';

describe('ReplayGuard', () => {
    it('accepts a strictly increasing sequence of numbers', () => {
        const guard = new ReplayGuard();
        expect(guard.accept('ctx', 1)).toBe(true);
        expect(guard.accept('ctx', 2)).toBe(true);
        expect(guard.accept('ctx', 5)).toBe(true);
    });

    it('rejects a replayed (duplicate) sequence number', () => {
        const guard = new ReplayGuard();
        expect(guard.accept('ctx', 3)).toBe(true);
        expect(guard.accept('ctx', 3)).toBe(false);
    });

    it('rejects an out-of-order (older) sequence number', () => {
        const guard = new ReplayGuard();
        expect(guard.accept('ctx', 5)).toBe(true);
        expect(guard.accept('ctx', 2)).toBe(false);
    });

    it('tracks each context independently', () => {
        const guard = new ReplayGuard();
        expect(guard.accept('call-1', 1)).toBe(true);
        expect(guard.accept('call-2', 1)).toBe(true);
        expect(guard.accept('call-1', 1)).toBe(false);
        expect(guard.accept('call-2', 2)).toBe(true);
    });

    it('reset() clears a single context only', () => {
        const guard = new ReplayGuard();
        guard.accept('ctx-a', 5);
        guard.accept('ctx-b', 5);

        guard.reset('ctx-a');

        expect(guard.accept('ctx-a', 1)).toBe(true); // forgotten, accepts a lower seq again
        expect(guard.accept('ctx-b', 1)).toBe(false); // still remembered
    });

    it('clear() resets every context', () => {
        const guard = new ReplayGuard();
        guard.accept('ctx-a', 5);
        guard.accept('ctx-b', 5);

        guard.clear();

        expect(guard.accept('ctx-a', 1)).toBe(true);
        expect(guard.accept('ctx-b', 1)).toBe(true);
    });
});
