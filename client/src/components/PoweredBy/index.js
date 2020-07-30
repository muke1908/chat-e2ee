import React from 'react';

import styles from './Style.module.css';

const PoweredBy = () => (
  <div className={styles.poweredBy}>
    <a href="https://www.pubnub.com/">
      <img
        width="100"
        src="//images.ctfassets.net/3prze68gbwl1/1F80MhwVeMnPKbhEHNti1P/53f850d58d8db73f335682cd2b2226af/Powered_By_PubNub_dark.png"
        alt="Powered By PubNub"
      />
    </a>
    &nbsp;&nbsp;
    <a>
      <img
        src="https://webassets.mongodb.com/_com_assets/cms/MongoDB_Logo_FullColorBlack_RGB-4td3yuxzjs.png"
        alt="Powered By Mongodb"
        width="100"
      />
    </a>
  </div>
);

export default PoweredBy;
