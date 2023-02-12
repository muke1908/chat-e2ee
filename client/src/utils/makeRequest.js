const makeRequest = async (url, {method = 'GET', body}) => {

    const res = await fetch(`/api/${url}`, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        ...(body && {body: JSON.stringify(body)})
    });

    if (!res.ok) {

        const json = res.headers.get('Content-Type')?.includes('application/json')
            ? await res.json()
            : await res.text();

        const err = new Error(json.message || json.error || JSON.stringify(json));
        err.status = res.status;

        throw err;
    }

    const response = await res.json();
    console.log('%clogging makeRequest', 'color:green; font-size:16px');

    console.log({
        'url': url,
        'method': method,
        'body': body,
        'response': response
    });

    return response;
};

export default makeRequest;
