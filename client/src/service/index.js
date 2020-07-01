export const makeRequest = async (url, { method = 'GET', body }) => {
  const res = await fetch(`/api/${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error({
      status: res.status,
      message: json.message
    });
  }

  return res.json();
};
