import {LINK_COLLECTION} from "../../../db/const";
import db from "../../../db";

const channelLock = async (channel, lock: boolean) => {
    if (!channel) {
        throw new Error("channel - required param");
    }
    const ifExists = await db.updateOneFromDb({hash: channel}, {lock: lock}, LINK_COLLECTION);

    if (!ifExists) {
        return {
            valid: false,
            state: "NOT_FOUND"
        };

    }

    return {
        valid: true,
        state: "Ok"
    };

};

export default channelLock;
