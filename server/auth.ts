import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  console.log("Configurazione delle impostazioni della sessione...");
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  console.log("Configurazione della strategia di autenticazione locale...");
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Tentativo di login per l'utente:", username);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log("Utente non trovato:", username);
          return done(null, false, { message: "Incorrect username" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.log("Password non valida per l'utente:", username);
          return done(null, false, { message: "Incorrect password" });
        }

        console.log("Login riuscito per l'utente:", username);
        return done(null, user);
      } catch (error) {
        console.error("Errore durante l'autenticazione:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("Serializzazione utente:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializzazione utente:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("Utente non trovato durante la deserializzazione:", id);
        return done(null, false);
      }
      console.log("Utente deserializzato con successo:", id);
      done(null, user);
    } catch (error) {
      console.error("Errore durante la deserializzazione dell'utente:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Tentativo di registrazione per l'utente:", req.body.username);

      // Validate request body
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Dati di registrazione non validi:", validationResult.error);
        return res.status(400).json({ error: validationResult.error.errors });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("Username già esistente:", req.body.username);
        return res.status(400).json({ error: "Username già esistente" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      console.log("Password hashata correttamente");

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      console.log("Nuovo utente creato con successo:", user.username);

      req.login(user, (err) => {
        if (err) {
          console.error("Errore durante il login post-registrazione:", err);
          return next(err);
        }
        res.status(201).json({ id: user.id, username: user.username });
      });
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Errore durante il login:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login fallito:", info?.message);
        return res.status(401).json({ error: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Errore durante il login:", err);
          return next(err);
        }
        console.log("Login completato per l'utente:", user.username);
        res.json({ id: user.id, username: user.username });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        console.error("Errore durante il logout:", err);
        return next(err);
      }
      console.log("Logout completato per l'utente:", username);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Tentativo di accesso non autorizzato all'API /user");
      return res.sendStatus(401);
    }
    console.log("Dati utente inviati per:", req.user?.username);
    res.json({ id: req.user?.id, username: req.user?.username });
  });
}