// File vuoto per compatibilità
export function encryptText(text: string): string {
  return text;
}

export function decryptText(text: string): string {
  return text;
}

export async function encryptFile(file: File): Promise<{
  data: string;
  fileName: string;
  mimeType: string;
  type: "image" | "video";
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        data: reader.result as string,
        fileName: file.name,
        mimeType: file.type,
        type: file.type.startsWith("image/") ? "image" : "video"
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function decryptFile(fileData: string): string {
  return fileData;
}