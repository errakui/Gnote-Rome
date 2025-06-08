import cryptoService from './services/crypto';

export async function testCrypto() {
  console.log('=== TEST CRITTOGRAFIA AES-256 ===');
  
  try {
    // Inizializza con credenziali di test
    await cryptoService.initialize('testuser', 'testpass');
    console.log('✅ Inizializzazione completata');
    
    // Test crittografia testo
    const testText = 'Ciao, questo è un test di crittografia!';
    console.log('Testo originale:', testText);
    
    const encrypted = await cryptoService.encrypt(testText);
    console.log('Testo criptato:', encrypted);
    
    const decrypted = await cryptoService.decrypt(encrypted);
    console.log('Testo decriptato:', decrypted);
    
    if (testText === decrypted) {
      console.log('✅ Test crittografia/decrittografia PASSATO');
    } else {
      console.log('❌ Test crittografia/decrittografia FALLITO');
    }
    
    // Test con testo già criptato dal desktop (esempio)
    // Questo dovrebbe essere un testo criptato reale dal desktop per test completo
    const desktopEncrypted = 'ENC:U2FsdGVkX1+...'; // Sostituire con valore reale
    
    console.log('\n=== FINE TEST ===');
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
} 