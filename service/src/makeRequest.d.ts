declare const makeRequest: (url: string, { method, body }: {
    method: string;
    body?: any;
}) => Promise<any>;
export default makeRequest;
