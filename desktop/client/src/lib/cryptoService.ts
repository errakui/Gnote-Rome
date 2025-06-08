import CryptoJS from 'crypto-js';

/**
 * Servizio di crittografia lato client per implementare AES-256
 * Permette di criptare e decriptare note e allegati per una vera architettura Zero-Knowledge
 */
export class CryptoService {
  private static instance: CryptoService;
  private encryptionKey: string = '';
  
  // Parametri fissi per compatibilità cross-platform
  private readonly IV = CryptoJS.enc.Utf8.parse('1234567890123456'); // IV fisso di 16 byte
  
  private constructor() {
    // Costruttore privato per pattern singleton
  }

  /**
   * Ottiene l'istanza singleton del servizio di crittografia
   */
  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Inizializza la chiave di crittografia da una password e un username
   * @param password Password dell'utente
   * @param username Username dell'utente
   */
  public initializeKey(password: string, username: string): void {
    // Generiamo una chiave derivata dalla password e dall'username
    // Utilizziamo PBKDF2 per rafforzare la sicurezza (Password-Based Key Derivation Function 2)
    const salt = CryptoJS.SHA256(username).toString();
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32, // 256 bit
      iterations: 1000,
      hasher: CryptoJS.algo.SHA256
    });
    
    this.encryptionKey = key.toString();
    
    // Salviamo la chiave in sessionStorage (solo per la sessione)
    // In un'implementazione più sicura si potrebbe evitare di salvare la chiave
    sessionStorage.setItem('encryptionKey', this.encryptionKey);
  }

  /**
   * Ripristina la chiave di crittografia dalla sessione o imposta quella fornita
   * @param key Chiave di crittografia (opzionale)
   * @returns true se la chiave è disponibile, false altrimenti
   */
  public restoreKey(key?: string): boolean {
    if (key) {
      this.encryptionKey = key;
      return true;
    }
    
    const storedKey = sessionStorage.getItem('encryptionKey');
    if (storedKey) {
      this.encryptionKey = storedKey;
      return true;
    }
    
    return false;
  }

  /**
   * Cancella la chiave di crittografia dalla memoria e dalla sessione
   */
  public clearKey(): void {
    this.encryptionKey = '';
    sessionStorage.removeItem('encryptionKey');
  }

  /**
   * Verifica se la chiave di crittografia è disponibile
   * @returns true se la chiave è disponibile, false altrimenti
   */
  public hasKey(): boolean {
    return !!this.encryptionKey;
  }

  /**
   * Cripta un testo in chiaro usando AES-256-CBC
   * @param plainText Testo in chiaro da criptare
   * @returns Testo criptato in formato stringa
   */
  public encrypt(plainText: string): string {
    if (!this.hasKey()) {
      throw new Error('Encryption key not available');
    }
    
    // Usa AES-256-CBC con IV fisso per compatibilità
    const encrypted = CryptoJS.AES.encrypt(plainText, this.encryptionKey, {
      iv: this.IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return encrypted.toString();
  }

  /**
   * Decripta un testo criptato usando AES-256-CBC
   * @param cipherText Testo criptato da decriptare
   * @returns Testo in chiaro
   */
  public decrypt(cipherText: string): string {
    if (!this.hasKey()) {
      throw new Error('Encryption key not available');
    }
    
    try {
      const decrypted = CryptoJS.AES.decrypt(cipherText, this.encryptionKey, {
        iv: this.IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Cripta un oggetto JSON
   * @param data Oggetto da criptare
   * @returns Rappresentazione criptata dell'oggetto
   */
  public encryptObject<T>(data: T): string {
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Decripta un oggetto JSON
   * @param cipherText Testo criptato da decriptare
   * @returns Oggetto decriptato
   */
  public decryptObject<T>(cipherText: string): T {
    try {
      const decrypted = this.decrypt(cipherText);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Failed to decrypt object:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Cripta un file in base64
   * @param base64Data Dati del file in formato base64
   * @returns Dati criptati
   */
  public encryptFile(base64Data: string): string {
    return this.encrypt(base64Data);
  }

  /**
   * Decripta un file criptato
   * @param encryptedData Dati criptati del file
   * @returns Dati decriptati in formato base64
   */
  public decryptFile(encryptedData: string): string {
    return this.decrypt(encryptedData);
  }
} 