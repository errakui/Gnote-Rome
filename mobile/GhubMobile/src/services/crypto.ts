import AsyncStorage from '@react-native-async-storage/async-storage';
import Aes from 'react-native-aes-crypto';

/**
 * Servizio di crittografia AES-256-CBC compatibile con la versione desktop
 * Usa PBKDF2 per derivare la chiave dalla password
 */
class CryptoService {
  private static instance: CryptoService;
  private encryptionKey: string | null = null;
  
  // Parametri che devono essere identici al desktop
  private readonly SALT = 'SecureNotesSalt2024'; // Salt per PBKDF2
  private readonly IV = '1234567890123456'; // IV fisso di 16 byte
  private readonly ITERATIONS = 1000; // Iterazioni PBKDF2
  private readonly KEY_SIZE = 256; // Dimensione chiave in bit

  private constructor() {}

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Deriva la chiave di crittografia da username e password usando PBKDF2
   */
  private async deriveKey(username: string, password: string): Promise<string> {
    // Combina username e password come fa il desktop
    const passphrase = password; // Il desktop usa solo la password per PBKDF2
    const salt = await Aes.sha256(username); // Usa l'hash dell'username come salt
    
    // Deriva la chiave usando PBKDF2
    const key = await Aes.pbkdf2(passphrase, salt, this.ITERATIONS, this.KEY_SIZE, 'sha256');
    return key;
  }

  /**
   * Inizializza il servizio con username e password
   */
  async initialize(username: string, password: string): Promise<void> {
    try {
      this.encryptionKey = await this.deriveKey(username, password);
      await AsyncStorage.setItem('encryptionKey', this.encryptionKey);
      await AsyncStorage.setItem('cryptoUsername', username);
    } catch (error) {
      console.error('Errore inizializzazione crypto:', error);
      throw error;
    }
  }

  /**
   * Carica la chiave salvata
   */
  async loadKey(): Promise<boolean> {
    try {
      const key = await AsyncStorage.getItem('encryptionKey');
      if (key) {
        this.encryptionKey = key;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Errore caricamento chiave:', error);
      return false;
    }
  }

  /**
   * Verifica se la chiave è disponibile
   */
  isEnabled(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Cripta un testo usando AES-256-CBC
   */
  async encrypt(text: string): Promise<string> {
    if (!this.encryptionKey || !text) return text;
    
    try {
      const encrypted = await Aes.encrypt(text, this.encryptionKey, this.IV, 'aes-256-cbc');
      return `ENC:${encrypted}`;
    } catch (error) {
      console.error('Errore crittografia:', error);
      return text;
    }
  }

  /**
   * Decripta un testo criptato con AES-256-CBC
   */
  async decrypt(encryptedText: string): Promise<string> {
    if (!this.encryptionKey || !encryptedText) return encryptedText;
    
    if (!encryptedText.startsWith('ENC:')) {
      return encryptedText;
    }
    
    try {
      const encrypted = encryptedText.substring(4);
      const decrypted = await Aes.decrypt(encrypted, this.encryptionKey, this.IV, 'aes-256-cbc');
      return decrypted;
    } catch (error) {
      console.error('Errore decrittografia:', error);
      return encryptedText;
    }
  }

  /**
   * Cripta un file (base64)
   */
  async encryptFile(base64Data: string): Promise<string> {
    if (!this.encryptionKey || !base64Data) return base64Data;
    
    try {
      const encrypted = await Aes.encrypt(base64Data, this.encryptionKey, this.IV, 'aes-256-cbc');
      return `ENC:${encrypted}`;
    } catch (error) {
      console.error('Errore crittografia file:', error);
      return base64Data;
    }
  }

  /**
   * Decripta un file criptato
   */
  async decryptFile(encryptedData: string): Promise<string> {
    if (!this.encryptionKey || !encryptedData) return encryptedData;
    
    if (!encryptedData.startsWith('ENC:')) {
      return encryptedData;
    }
    
    try {
      const encrypted = encryptedData.substring(4);
      const decrypted = await Aes.decrypt(encrypted, this.encryptionKey, this.IV, 'aes-256-cbc');
      return decrypted;
    } catch (error) {
      console.error('Errore decrittografia file:', error);
      return encryptedData;
    }
  }

  /**
   * Pulisce la chiave e i dati salvati
   */
  async clear(): Promise<void> {
    this.encryptionKey = null;
    await AsyncStorage.removeItem('encryptionKey');
    await AsyncStorage.removeItem('cryptoUsername');
  }
}

export default CryptoService.getInstance(); 