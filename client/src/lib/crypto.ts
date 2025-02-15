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
          console.error("FileReader non ha prodotto risultati");
          throw new Error("Errore nella lettura del file");
        }

        console.log("[Debug] Tipo di file:", file.type);
        const base64String = event.target.result.toString().split(',')[1];
        console.log("[Debug] Lunghezza base64:", base64String.length);

        // Converti la chiave in WordArray
        const keyWordArray = CryptoJS.enc.Utf8.parse(key);
        // Converti i dati in WordArray
        const dataWordArray = CryptoJS.enc.Base64.parse(base64String);

        // Crea un oggetto valido per la crittografia
        const encrypted = CryptoJS.AES.encrypt(
          dataWordArray, 
          keyWordArray, 
          {
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
            iv: CryptoJS.lib.WordArray.random(16)
          }
        );

        console.log("[Debug] Crittografia completata, lunghezza:", encrypted.toString().length);

        const type = file.type.startsWith('image/') ? 'image' : 'video';

        resolve({
          data: encrypted.toString(),
          fileName: file.name,
          mimeType: file.type,
          type
        });
      } catch (error) {
        console.error('[Debug] Errore dettagliato:', error);
        reject(new Error("Errore durante la crittografia del file"));
      }
    };

    reader.onerror = () => {
      console.error('[Debug] Errore FileReader:', reader.error);
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
    console.log("[Debug] Inizio decrittografia, lunghezza dati:", encryptedData.length);

    // Converti la chiave in WordArray
    const keyWordArray = CryptoJS.enc.Utf8.parse(key);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, keyWordArray, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    console.log("[Debug] Decrittografia completata");
    return decrypted.toString(CryptoJS.enc.Base64);
  } catch (error) {
    console.error('[Debug] Errore decrittografia:', error);
    throw new Error("Errore durante la decrittografia del file");
  }
}