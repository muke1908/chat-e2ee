export const LOCK_ROOM = 'LOCK_ROOM';
export const UNLOCK_ROOM = 'UNLOCK_ROOM';


export function roomLock() {
    return {
        type: LOCK_ROOM,
        payload: false
    };
}

export function roomUnlock() {
    return {
        type: UNLOCK_ROOM,
        payload: true
    };

}