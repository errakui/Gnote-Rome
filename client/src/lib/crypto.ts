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
        const keyString = CryptoJS.enc.Utf8.parse(key);
        const wordArray = CryptoJS.enc.Base64.parse(base64String);
        const encrypted = CryptoJS.AES.encrypt(wordArray, keyString, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        });

        const type = file.type.startsWith('image/') ? 'image' : 'video';

        resolve({
          data: encrypted.toString(),
          fileName: file.name,
          mimeType: file.type,
          type
        });
      } catch (error) {
        console.error('Errore durante la crittografia:', error);
        reject(new Error("Errore durante la crittografia del file"));
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
  try {
    const keyString = CryptoJS.enc.Utf8.parse(key);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, keyString, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Base64);
  } catch (error) {
    console.error('Errore durante la decrittografia:', error);
    throw new Error("Errore durante la decrittografia del file");
  }
}