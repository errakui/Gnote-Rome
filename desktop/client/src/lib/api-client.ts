// URL dell'API basato sull'ambiente
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper per le chiamate API
export const apiClient = {
  get: (path: string) => fetch(`${API_URL}${path}`, {
    credentials: 'include',
  }),
  
  post: (path: string, data: any) => fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  }),
  
  put: (path: string, data: any) => fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  }),
  
  delete: (path: string) => fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  }),
}; 