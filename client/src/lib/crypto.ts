import CryptoJS from 'crypto-js';

export function encryptText(text: string, key: string): string {
  if (!text || !key) {
    throw new Error("Testo e chiave sono richiesti per la crittografia");
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

export async function encryptFile(file: File, key: string): Promise<{ 
  data: string; 
  fileName: string;
  mimeType: string;
  type: "image" | "video";
}> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );
  const encrypted = CryptoJS.AES.encrypt(base64, key).toString();

  const type = file.type.startsWith('image/') ? 'image' : 'video';

  return {
    data: encrypted,
    fileName: file.name,
    mimeType: file.type,
    type
  };
}

export function decryptFile(
  encryptedData: string, 
  key: string
): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  return decrypted.toString(CryptoJS.enc.Utf8);
}