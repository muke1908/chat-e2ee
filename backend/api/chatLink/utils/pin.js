const crypto = require('crypto')


const base36map = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

module.exports.generatePIN = (uuid, pinLength = 4) => {

    /*
        This function generates a unique PIN given the UUID. The parameters are:
        uuid => A string which can be uuid (the chat-hash in this case)
        pinLength => length of the unique PIN to generate, default is 4
    */
    
    //generate MD5 hash in hex representation
    const md5HashInt = parseInt(
        crypto.createHash('md5').update(uuid).digest('hex'), 16
    );

    //get mod 36 values
    const rems = [];
    let n = md5HashInt;
    while( n > 0 ) {
        rems.push(n % 36);
        n = Math.floor( n / 36 );
    } 

    //randomly map K indexes to characters in base36map 
    const randomChars = [];
    for(var i = 0; i < pinLength; i++) {
        randomChars.push(
            base36map[ rems[ (Math.random() * rems.length) | 0] ]
        );
    }

    return randomChars.join("");
}

