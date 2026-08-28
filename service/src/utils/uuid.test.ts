import { generateUUID } from './uuid';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateUUID()', () => {
    it('returns a well-formed UUID v4 string', () => {
        const uuid = generateUUID();
        expect(uuid).toMatch(UUID_V4_REGEX);
    });

    it('generates unique values across many invocations', () => {
        const uuids = new Set(Array.from({ length: 1000 }, () => generateUUID()));
        expect(uuids.size).toBe(1000);
    });
});
