import {LOCK_ROOM, UNLOCK_ROOM} from "./lockRoomActions";

const initialState = {
    lock: true
}
const lockRoomReducer = (state = initialState, action) => {
    switch (action.type) {
        case LOCK_ROOM :
            return {
                ...state,
                lock: action.payload
            };

        case UNLOCK_ROOM :

            return {
                ...state,
                lock: action.payload
            };

        default:
            return state;
    }
}
export default lockRoomReducer;