import CryptoJS from "crypto-js";

export function encryptText(text: string, key: string): string {
  if (!text) {
    throw new Error("Il contenuto della nota non può essere vuoto");
  }
  if (!key) {
    throw new Error("Devi essere loggato per criptare le note");
  }
  const keyString = CryptoJS.enc.Utf8.parse(key);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, keyString, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    iv: iv,
  });

  return iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
}

export function decryptText(ciphertext: string, key: string): string {
  if (!ciphertext || !key) {
    console.warn("[Crypto] Dati mancanti per decrittografia:", {
      hasCiphertext: !!ciphertext,
      hasKey: !!key,
      keyLength: key?.length
    });
    return "";
  }

  try {
    console.log("[Crypto] Tentativo decrittografia:", { 
      ciphertextLength: ciphertext.length, 
      keyLength: key.length,
      ciphertext: ciphertext.substring(0, 32) + "..."
    });

    const keyString = CryptoJS.enc.Utf8.parse(key);
    const combined = CryptoJS.enc.Base64.parse(ciphertext);

    if (combined.words.length < 4) {
      console.warn("[Debug] Ciphertext troppo corto");
      return "";
    }

    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const encryptedText = CryptoJS.lib.WordArray.create(combined.words.slice(4));

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedText },
      keyString,
      {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        iv: iv,
      },
    );

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      console.warn("[Debug] Decrittazione ha prodotto stringa vuota");
      return "";
    }

    return result;
  } catch (error) {
    console.error("[Debug] Errore decrittografia:", error);
    return "";
  }
}

export function encryptFile(
  file: File,
  key: string,
): Promise<{
  data: string;
  fileName: string;
  mimeType: string;
  type: "image" | "video";
}> {
  if (!file.type.match(/^(image|video)\//)) {
    throw new Error("Tipo di file non supportato");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          console.error("FileReader non ha prodotto risultati");
          throw new Error("Errore nella lettura del file");
        }

        const base64String = event.target.result.toString().split(",")[1];
        const keyWordArray = CryptoJS.enc.Utf8.parse(key);
        const dataWordArray = CryptoJS.enc.Base64.parse(base64String);
        const iv = CryptoJS.lib.WordArray.random(16);

        const encrypted = CryptoJS.AES.encrypt(dataWordArray, keyWordArray, {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
          iv: iv,
        });

        const combined = iv
          .concat(encrypted.ciphertext)
          .toString(CryptoJS.enc.Base64);

        resolve({
          data: combined,
          fileName: file.name,
          mimeType: file.type,
          type: file.type.startsWith("image/") ? "image" : "video",
        });
      } catch (error) {
        console.error("[Debug] Errore dettagliato:", error);
        reject(new Error("Errore durante la crittografia del file"));
      }
    };

    reader.onerror = () => {
      console.error("[Debug] Errore FileReader:", reader.error);
      reject(new Error("Errore nella lettura del file"));
    };

    reader.readAsDataURL(file);
  });
}

export function decryptFile(encryptedData: string, key: string): string {
  try {
    const keyWordArray = CryptoJS.enc.Utf8.parse(key);
    const combined = CryptoJS.enc.Base64.parse(encryptedData);

    if (combined.words.length < 4) {
      console.warn("[Debug] Dati cifrati non validi o troppo corti");
      throw new Error("Dati cifrati non validi");
    }

    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      keyWordArray,
      {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        iv: iv,
      },
    );

    const result = decrypted.toString(CryptoJS.enc.Base64);
    if (!result) {
      console.warn("[Debug] Decrittazione file ha prodotto dati vuoti");
      throw new Error("Decrittazione ha prodotto dati vuoti");
    }

    return result;
  } catch (error) {
    console.error("[Debug] Errore decrittazione file:", error);
    throw new Error("Errore durante la decrittografia del file");
  }
}