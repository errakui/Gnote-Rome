// Configurazione database Neon
export const DATABASE_CONFIG = {
  // Connessione diretta a Neon Database
  connectionString: 'postgresql://Gnote_owner:npg_CIA3W2yroiXH@ep-fragrant-sun-abelh3vq-pooler.eu-west-2.aws.neon.tech/Gnote?sslmode=require',
  
  // Configurazione per sviluppo locale (se necessario)
  development: {
    host: 'ep-fragrant-sun-abelh3vq-pooler.eu-west-2.aws.neon.tech',
    database: 'Gnote',
    username: 'Gnote_owner',
    password: 'npg_CIA3W2yroiXH',
    port: 5432,
    ssl: true,
  }
}; 