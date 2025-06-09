// API semplice per comunicare con il server minimalista
const API_URL = 'http://10.0.2.2:5001/api'; // Per Android emulator
// const API_URL = 'http://localhost:5001/api'; // Per iOS simulator

export const api = {
  // Auth
  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login fallito');
    }
    
    return response.json();
  },

  async register(username: string, password: string) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registrazione fallita');
    }
    
    return response.json();
  },

  // Notes
  async getNotes(userId: number) {
    const response = await fetch(`${API_URL}/notes/${userId}`);
    
    if (!response.ok) {
      throw new Error('Impossibile caricare le note');
    }
    
    const data = await response.json();
    return data.notes;
  },

  async createNote(userId: number, title: string, content: string) {
    const response = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, content }),
    });
    
    if (!response.ok) {
      throw new Error('Impossibile creare la nota');
    }
    
    const data = await response.json();
    return data.note;
  },

  async updateNote(noteId: number, userId: number, title: string, content: string) {
    const response = await fetch(`${API_URL}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, content }),
    });
    
    if (!response.ok) {
      throw new Error('Impossibile aggiornare la nota');
    }
    
    const data = await response.json();
    return data.note;
  },

  async deleteNote(noteId: number, userId: number) {
    const response = await fetch(`${API_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error('Impossibile eliminare la nota');
    }
    
    return true;
  },

  // Gallery
  async getGalleryItems(userId: number) {
    const response = await fetch(`${API_URL}/gallery/${userId}`);
    
    if (!response.ok) {
      throw new Error('Impossibile caricare la galleria');
    }
    
    const data = await response.json();
    return data.items;
  },
}; 