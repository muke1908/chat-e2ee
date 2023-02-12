import {LINK_COLLECTION} from "../../../db/const";
import db from "../../../db";

const isLockChannel = async (channel) => {
    if (!channel) {
        throw new Error("channel - required param");
    }
    const ifExists = await db.findOneFromDB({hash: channel}, LINK_COLLECTION);
    if (!ifExists) {
        return {
            valid: false,
            state: "NOT_FOUND"
        };
    }
    const {lock} = ifExists;

    return {
        valid: true,
        state: lock
    };
};

export default isLockChannel;
