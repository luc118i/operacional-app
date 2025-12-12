export const API_URL = "http://localhost:3333";

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  return handleResponse(res);
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiPut(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    console.error("[API ERROR]", res.status, text);
    throw new Error(`Erro na API (${res.status})`);
  }

  return res.json();
}
