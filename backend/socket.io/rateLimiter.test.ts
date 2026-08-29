import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
    let now: number;

    beforeEach(() => {
        now = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('allows consumption up to the bucket capacity', () => {
        const limiter = new RateLimiter({ capacity: 3, refillPerSecond: 1 });
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(true);
    });

    it('rejects consumption once the bucket is empty', () => {
        const limiter = new RateLimiter({ capacity: 2, refillPerSecond: 1 });
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(false);
    });

    it('refills tokens over time', () => {
        const limiter = new RateLimiter({ capacity: 2, refillPerSecond: 1 });
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(false);

        now += 1000; // 1 second later -> +1 token
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(false);
    });

    it('never refills beyond capacity', () => {
        const limiter = new RateLimiter({ capacity: 2, refillPerSecond: 100 });
        limiter.consume('a');
        now += 10_000; // huge elapsed time
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(false);
    });

    it('tracks each key independently', () => {
        const limiter = new RateLimiter({ capacity: 1, refillPerSecond: 1 });
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('b')).toBe(true);
        expect(limiter.consume('a')).toBe(false);
        expect(limiter.consume('b')).toBe(false);
    });

    it('reset() forgets a key, restoring a full bucket on next use', () => {
        const limiter = new RateLimiter({ capacity: 1, refillPerSecond: 1 });
        expect(limiter.consume('a')).toBe(true);
        expect(limiter.consume('a')).toBe(false);

        limiter.reset('a');

        expect(limiter.consume('a')).toBe(true);
    });
});
