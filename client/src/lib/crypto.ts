import CryptoJS from 'crypto-js';

export function encryptText(text: string, key: string): string {
  if (!text) {
    throw new Error("Il contenuto della nota non può essere vuoto");
  }
  if (!key) {
    throw new Error("Devi essere loggato per criptare le note");
  }
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decryptText(ciphertext: string, key: string): string {
  if (!ciphertext || !key) {
    throw new Error("Testo cifrato e chiave sono richiesti per la decrittografia");
  }
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function encryptFile(file: File, key: string): Promise<{ 
  data: string; 
  fileName: string;
  mimeType: string;
  type: "image" | "video";
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        // Prendiamo solo la parte di dati dopo la virgola nel DataURL
        const base64 = reader.result?.toString().split(',')[1] || '';

        // Crittografiamo direttamente la stringa base64
        const encrypted = CryptoJS.AES.encrypt(base64, key).toString();

        resolve({
          data: encrypted,
          fileName: file.name,
          mimeType: file.type,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        });
      } catch (error) {
        console.error('Errore durante la crittografia:', error);
        reject(new Error("Errore durante la crittografia del file"));
      }
    };

    reader.onerror = () => {
      console.error('Errore nella lettura del file:', reader.error);
      reject(new Error("Errore nella lettura del file"));
    };

    // Legge il file come DataURL (che include il tipo MIME)
    reader.readAsDataURL(file);
  });
}

export function decryptFile(encrypted: string, key: string): string {
  try {
    // Decrittiamo per ottenere il base64 originale
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Errore durante la decrittografia:', error);
    throw new Error("Errore durante la decrittografia del file");
  }
}