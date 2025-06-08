# 🔐 SecureNotes - Zero-Knowledge Note Taking App

Un'applicazione completa per prendere note con crittografia end-to-end, che garantisce la privacy assoluta dei tuoi dati. Disponibile su Web, Desktop e Mobile.

## 🌟 Caratteristiche Principali

- **🔒 Crittografia AES-256**: Tutte le note sono crittografate lato client prima di essere inviate al server
- **🚫 Zero-Knowledge**: Il server non può mai accedere al contenuto delle tue note
- **📱 Multi-piattaforma**: Web, Desktop (Electron) e Mobile (React Native)
- **🔄 Sincronizzazione**: Le note si sincronizzano tra tutti i tuoi dispositivi
- **📎 Allegati**: Supporto per file allegati (anch'essi crittografati)
- **🏷️ Organizzazione**: Tag e cartelle per organizzare le note
- **🔍 Ricerca**: Ricerca locale nelle note decriptate

## 📁 Struttura del Progetto

```
SecureNotes/
├── 📱 mobile/                    # App React Native
│   └── GhubMobile/
│       ├── src/
│       │   ├── screens/         # Schermate dell'app
│       │   ├── services/        # Servizi (API, crypto)
│       │   ├── components/      # Componenti riutilizzabili
│       │   └── navigation/      # Navigazione
│       ├── android/            # Configurazione Android
│       └── ios/                # Configurazione iOS
│
├── 🖥️ desktop/                   # Backend + Frontend Web
│   ├── server/                 # Backend Express.js
│   │   ├── index.ts           # Entry point del server
│   │   ├── routes.ts          # API routes
│   │   ├── auth.ts            # Autenticazione
│   │   └── db.ts              # Configurazione database
│   ├── client/                # Frontend React
│   │   ├── src/
│   │   │   ├── components/    # Componenti UI
│   │   │   ├── lib/          # Utilities e servizi
│   │   │   └── pages/        # Pagine dell'app
│   │   └── public/           # Asset statici
│   └── shared/               # Codice condiviso
│       └── schema.ts         # Schema database Drizzle
│
├── 📄 src/                      # (Legacy - da rimuovere)
└── 📋 package.json             # Configurazione root

```

## 🚀 Installazione e Setup

### Prerequisiti

- Node.js 18+
- npm o yarn
- Android Studio (per mobile Android)
- Xcode (per mobile iOS - solo macOS)
- PostgreSQL o account [Neon](https://neon.tech) per il database

### 1. Clona il repository

```bash
git clone https://github.com/tuousername/SecureNotes.git
cd SecureNotes
```

### 2. Setup del Backend

```bash
cd desktop
npm install

# Crea il file .env
cat > .env << EOF
DATABASE_URL=postgresql://user:password@host/database
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
PORT=5001
EOF

# Avvia il server
npm run dev
```

### 3. Setup del Frontend Web

Il frontend si avvia automaticamente con il backend in modalità development.
Apri http://localhost:5000

### 4. Setup Mobile

```bash
cd mobile/GhubMobile
npm install

# Per iOS (solo macOS)
cd ios && pod install && cd ..

# Avvia l'app
npm run android  # o npm run ios
```

## 🔐 Architettura di Sicurezza

### Crittografia Client-Side

1. **Derivazione Chiave**: PBKDF2 con SHA256 (1000 iterazioni)
2. **Algoritmo**: AES-256-CBC
3. **Autenticazione**: Passport.js con sessioni sicure
4. **Storage**: Le chiavi sono salvate solo in memoria/sessionStorage

### Flusso di Sicurezza

```
1. Login → Password → PBKDF2 → Chiave AES
2. Creazione nota → Testo → AES Encrypt → Server
3. Lettura nota → Server → AES Decrypt → Visualizzazione
```

Il server memorizza solo dati crittografati con prefisso `ENC:`

## 🛠️ Tecnologie Utilizzate

### Backend
- **Express.js**: Framework web
- **TypeScript**: Type safety
- **Drizzle ORM**: Database ORM
- **PostgreSQL**: Database
- **Passport.js**: Autenticazione

### Frontend Web
- **React 18**: UI Framework
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **Shadcn/ui**: Componenti UI
- **CryptoJS**: Crittografia browser

### Mobile
- **React Native**: Framework mobile
- **react-native-aes-crypto**: Crittografia nativa
- **React Navigation**: Navigazione
- **AsyncStorage**: Storage locale

## 📱 Screenshot

### Web
![Web Dashboard](docs/images/web-dashboard.png)

### Mobile
![Mobile App](docs/images/mobile-app.png)

## 🔧 API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login utente
- `POST /api/auth/register` - Registrazione
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Info utente corrente

### Note
- `GET /api/notes` - Lista note (crittografate)
- `POST /api/notes` - Crea nota
- `PUT /api/notes/:id` - Aggiorna nota
- `DELETE /api/notes/:id` - Elimina nota

### File
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Download file

## 🐛 Problemi Comuni

### Il backend non si avvia
```bash
# Assicurati di avere il file .env configurato
cd desktop
cat .env  # Verifica che DATABASE_URL sia presente
```

### L'app mobile non si connette al backend
```javascript
// In mobile/GhubMobile/src/services/api.ts
// Per emulatore Android usa:
const BASE_URL = 'http://10.0.2.2:5001/api'
// Per dispositivo fisico usa l'IP locale del tuo computer
```

### Errori di crittografia
- Verifica che desktop e mobile usino gli stessi parametri (salt, IV, iterations)
- Controlla che il prefisso `ENC:` sia gestito correttamente

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 👥 Autori

- **Il tuo nome** - *Sviluppo iniziale* - [tuousername](https://github.com/tuousername)

## 🙏 Ringraziamenti

- Shadcn per i componenti UI
- React Native community
- Tutti i contributori open source

---

**Nota sulla sicurezza**: Questo è un progetto dimostrativo. Per uso in produzione, si consiglia una revisione di sicurezza professionale. 