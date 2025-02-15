import CryptoJS from 'crypto-js';

export function encryptText(text: string, key: string): string {
  if (!text) {
    throw new Error("Il contenuto della nota non può essere vuoto");
  }
  if (!key) {
    throw new Error("Devi essere loggato per criptare le note");
  }
  const keyString = CryptoJS.enc.Utf8.parse(key);
  return CryptoJS.AES.encrypt(text, keyString).toString();
}

export function decryptText(ciphertext: string, key: string): string {
  if (!ciphertext || !key) {
    throw new Error("Testo cifrato e chiave sono richiesti per la decrittografia");
  }
  const keyString = CryptoJS.enc.Utf8.parse(key);
  const bytes = CryptoJS.AES.decrypt(ciphertext, keyString);
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

    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("Errore nella lettura del file");
        }

        const base64String = event.target.result.toString().split(',')[1];
        const encrypted = CryptoJS.AES.encrypt(base64String, key).toString();

        const type = file.type.startsWith('image/') ? 'image' : 'video';

        resolve({
          data: encrypted,
          fileName: file.name,
          mimeType: file.type,
          type
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Errore nella lettura del file"));
    };

    reader.readAsDataURL(file);
  });
}

export function decryptFile(
  encryptedData: string, 
  key: string
): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  return decrypted.toString(CryptoJS.enc.Utf8);
}