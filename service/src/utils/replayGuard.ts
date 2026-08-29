/**
 * Tracks the highest sequence number seen per context key and rejects
 * non-increasing values, providing replay/duplicate protection for
 * decrypted envelope payloads (each payload carries a monotonically
 * increasing `seq` chosen by its sender).
 *
 * A context is any string the caller chooses to scope sequence tracking by
 * (e.g. a call id for signaling, or a fixed key such as `'chat'` for chat
 * messages within the active room).
 */
export class ReplayGuard {
    private lastSeqByContext: Map<string, number> = new Map();

    /**
     * Returns `true` (and records the sequence number) if `seq` is greater
     * than the last one accepted for `context`; returns `false` for a
     * replayed or duplicate/out-of-order message without mutating state.
     */
    public accept(context: string, seq: number): boolean {
        const last = this.lastSeqByContext.get(context);
        if (typeof last === 'number' && seq <= last) {
            return false;
        }
        this.lastSeqByContext.set(context, seq);
        return true;
    }

    public reset(context: string): void {
        this.lastSeqByContext.delete(context);
    }

    public clear(): void {
        this.lastSeqByContext.clear();
    }
}
