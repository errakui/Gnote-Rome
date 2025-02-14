import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

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
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          console.log("Tentativo di login fallito per l'utente:", username);
          return done(null, false);
        } else {
          console.log("Login riuscito per l'utente:", username);
          return done(null, user);
        }
      } catch (error) {
        console.error("Errore durante l'autenticazione:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error("Errore durante la deserializzazione dell'utente:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    console.log("Tentativo di registrazione per l'utente:", req.body.username);
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("Username già esistente:", req.body.username);
        return res.status(400).send("Username già esistente");
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
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    console.log("Login completato per l'utente:", req.user?.username);
    res.status(200).json(req.user);
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
    res.json(req.user);
  });
}