interface ErrorWithStatus extends Error {
  status?: number;
}

const makeRequest = async (
  url: string,
  { method = "GET", body }: { method?: string; body?: object }
) => {
  const res = await fetch(`/api/${url}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!res.ok) {
    const contentType = res.headers.get("Content-Type") || "";
    const json = contentType.includes("application/json") ? await res.json() : await res.text();

    const err = new Error(json.message || json.error || JSON.stringify(json)) as ErrorWithStatus;
    err.status = res.status;

    throw err;
  }

  return await res.json();
};

export default makeRequest;
