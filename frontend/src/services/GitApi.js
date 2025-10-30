const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

export async function validateRepo(repositoryPath) {
  const res = await fetch(`${API_BASE}/git/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositoryPath })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || 'Failed to validate repository');
  }
  return json.data;
}

export async function getBranches(repositoryPath, query = '', limit = 20, includeRemotes = true) {
  const res = await fetch(`${API_BASE}/git/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositoryPath, query, limit, includeRemotes })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || 'Failed to fetch branches');
  }
  return json.data;
}


