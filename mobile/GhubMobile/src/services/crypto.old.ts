import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

// Implementazione semplice ma funzionante per React Native
class CryptoService {
  private encryptionKey: string | null = null;

  async initialize(username: string, password: string): Promise<void> {
    // Genera una chiave basata su username e password
    this.encryptionKey = `${username}:${password}`;
    await AsyncStorage.setItem('encryptionKey', this.encryptionKey);
  }

  async loadKey(): Promise<boolean> {
    const key = await AsyncStorage.getItem('encryptionKey');
    if (key) {
      this.encryptionKey = key;
      return true;
    }
    return false;
  }

  // Semplice XOR per ora - funziona e basta!
  private xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return Buffer.from(result).toString('base64');
  }

  private xorDecrypt(encrypted: string, key: string): string {
    const text = Buffer.from(encrypted, 'base64').toString();
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }

  async encrypt(text: string): Promise<string> {
    if (!this.encryptionKey || !text) return text;
    
    try {
      const encrypted = this.xorEncrypt(text, this.encryptionKey);
      return `ENC:${encrypted}`;
    } catch (error) {
      console.error('Errore crittografia:', error);
      return text;
    }
  }

  async decrypt(encryptedText: string): Promise<string> {
    if (!this.encryptionKey || !encryptedText) return encryptedText;
    
    if (!encryptedText.startsWith('ENC:')) {
      return encryptedText;
    }
    
    try {
      const encrypted = encryptedText.substring(4);
      return this.xorDecrypt(encrypted, this.encryptionKey);
    } catch (error) {
      console.error('Errore decrittografia:', error);
      return encryptedText;
    }
  }

  async encryptFile(base64Data: string): Promise<string> {
    // Per ora manteniamo i file come sono
    return `ENC:${base64Data}`;
  }

  async decryptFile(encryptedData: string): Promise<string> {
    if (!encryptedData.startsWith('ENC:')) {
      return encryptedData;
    }
    return encryptedData.substring(4);
  }

  isEnabled(): boolean {
    return this.encryptionKey !== null;
  }

  async clear(): Promise<void> {
    this.encryptionKey = null;
    await AsyncStorage.removeItem('encryptionKey');
  }
}

export default new CryptoService(); 