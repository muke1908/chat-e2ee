import crypto from "crypto";
const base36map = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const generatePIN = (uuid: string, pinLength = 4): string => {
  /*
        This function generates a unique PIN given the UUID. The parameters are:
        uuid => A string which can be uuid (the chat-hash in this case)
        pinLength => length of the unique PIN to generate, default is 4
    */

  //generate MD5 hash in hex representation
  const md5HashInt = parseInt(crypto.createHash("sha256").update(uuid).digest("hex"), 16);

  //get mod 36 values
  const rems = [];
  let n = md5HashInt;
  while (n > 0) {
    rems.push(n % 36);
    n = Math.floor(n / 36);
  }

  //randomly map K indexes to characters in base36map
  const randomChars = [];
  for (let i = 0; i < pinLength; i++) {
    randomChars.push(base36map[rems[crypto.randomInt(0, 37)]]);
  }

  return randomChars.join("");
};
