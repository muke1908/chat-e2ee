type configType = {
    apiURL: string | null,
    socketURL: string | null
}

let chate2eeConfig: configType = {
    apiURL: null,
    socketURL: null
};

export const setConfig: (apiURL: string, socketURL: string) => void = (apiURL, socketURL) => {
    chate2eeConfig = { apiURL, socketURL }
}

export const configContext = (): configType => chate2eeConfig;