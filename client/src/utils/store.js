
import {combineReducers} from 'redux';
import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import lockRoomReducer from "./lockRoomReducer";
export default createStore(
    combineReducers({
            lockRoom:lockRoomReducer
    }), applyMiddleware(thunk)
);


