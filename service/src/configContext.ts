import { configType, SetConfigType } from './public/types';
import { Logger } from './utils/logger';

let chate2eeConfig: configType = {
    settings: {
        disableLog: false // true - Disable Logs; false - Enable Logs
    },
    baseUrl: 'http://localhost:3001',
};

export const setConfig: SetConfigType = (config) => {
    const logger = new Logger('Config').count();
    logger.log(`Overriding config`, config);
    chate2eeConfig = { ...chate2eeConfig, ...config }
}

export const configContext = (): configType => chate2eeConfig;