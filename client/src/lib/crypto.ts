// File vuoto per compatibilità, nessuna crittografia necessaria
export function encryptText(text: string): string {
  return text;
}

export function decryptText(text: string): string {
  return text;
}

export function encryptFile(file: File): Promise<{
  data: string;
  fileName: string;
  mimeType: string;
  type: "image" | "video";
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        reject(new Error("Errore nella lettura del file"));
        return;
      }
      resolve({
        data: event.target.result.toString(),
        fileName: file.name,
        mimeType: file.type,
        type: file.type.startsWith("image/") ? "image" : "video"
      });
    };
    reader.onerror = () => reject(new Error("Errore nella lettura del file"));
    reader.readAsDataURL(file);
  });
}

export function decryptFile(fileData: string): string {
  return fileData;
}
