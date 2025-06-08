# SecureNotes

SecureNotes è un'applicazione per la gestione di note sicure con autenticazione utente e supporto per allegati multimediali.

## Caratteristiche principali

- Autenticazione sicura degli utenti
- Creazione, visualizzazione, modifica ed eliminazione di note personali
- Supporto per allegati multimediali (immagini e video)
- Interfaccia utente moderna e reattiva
- Crittografia dei dati sensibili
- API RESTful

## Tecnologie utilizzate

### Backend
- Node.js con Express
- PostgreSQL (Neon Database)
- Drizzle ORM
- Passport.js per l'autenticazione
- Crypto per la crittografia

### Frontend
- React
- Tailwind CSS
- Shadcn UI Components
- React Query per la gestione dello stato e delle chiamate API

## Prerequisiti

- Node.js (v18+)
- Un database PostgreSQL (o accesso a Neon Database)

## Configurazione

1. Clona il repository:

```bash
git clone https://github.com/tuoutente/SecureNotes.git
cd SecureNotes
```

2. Installa le dipendenze:

```bash
npm install
```

3. Configura le variabili d'ambiente:

Crea un file `.env` nella root del progetto con il seguente contenuto:

```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
SESSION_SECRET=your_secret_key
PORT=5000
```

4. Esegui la migrazione del database:

```bash
npm run db:push
```

## Avvio dell'applicazione

### Modalità sviluppo

```bash
npm run dev
```

L'applicazione sarà disponibile all'indirizzo: `http://localhost:5000`

### Modalità produzione

```bash
npm run build
npm start
```

## Struttura del progetto

```
SecureNotes/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componenti UI
│   │   ├── hooks/          # Hook personalizzati
│   │   ├── lib/            # Utilità
│   │   ├── pages/          # Pagine dell'applicazione
│   │   ├── App.tsx         # Componente root
│   │   └── main.tsx        # Entry point
│   └── index.html
├── server/                 # Backend Express
│   ├── auth.ts             # Autenticazione
│   ├── db.ts               # Configurazione database
│   ├── index.ts            # Entry point server
│   ├── routes.ts           # Definizione API
│   ├── storage.ts          # Logica database
│   └── vite.ts             # Configurazione Vite dev server
├── shared/                 # Codice condiviso
│   └── schema.ts           # Schema database e validazione
├── package.json
├── drizzle.config.ts
└── vite.config.ts
```

## API Endpoints

### Autenticazione
- `POST /api/register` - Registrazione utente
- `POST /api/login` - Login utente
- `POST /api/logout` - Logout utente
- `GET /api/user` - Informazioni utente corrente

### Note
- `GET /api/notes` - Ottieni tutte le note dell'utente
- `GET /api/notes/:id` - Ottieni dettagli di una nota specifica
- `POST /api/notes` - Crea una nuova nota
- `PATCH /api/notes/:id` - Aggiorna una nota esistente
- `DELETE /api/notes/:id` - Elimina una nota

## Sviluppo futuro

Consulta il file [ROADMAP.md](./ROADMAP.md) per i piani futuri di sviluppo, inclusa la conversione in app mobile.

## Licenza

MIT 