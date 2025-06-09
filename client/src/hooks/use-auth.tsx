import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { InsertUser, User as SelectUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CryptoService } from "@/lib/cryptoService";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const cryptoService = CryptoService.getInstance();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache',
          }
        });

        if (!res.ok) {
          if (res.status === 401) {
            queryClient.setQueryData(["user"], null);
            return null;
          }
          throw new Error(await res.text());
        }

        const data = await res.json();
        if (!data || !data.id) {
          queryClient.setQueryData(["user"], null);
          return null;
        }

        // Tentiamo di ripristinare la chiave di crittografia dalla sessione
        cryptoService.restoreKey();

        return data;
      } catch (error) {
        queryClient.setQueryData(["user"], null);
        throw error;
      }
    },
    staleTime: 60 * 1000, // 1 minuto
    refetchInterval: 2 * 60 * 1000, // 2 minuti 
    refetchOnWindowFocus: true,
    retry: 5,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 30000)
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      // Inizializza la chiave di crittografia dalla password e username
      cryptoService.initializeKey(credentials.password, credentials.username);
      
      const res = await apiRequest("POST", "/api/login", credentials);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Accesso completato",
        description: "Crittografia AES-256 inizializzata",
      });
    },
    onError: () => {
      // Pulisci la chiave in caso di errore di login
      cryptoService.clearKey();
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
      
      // Cancella la chiave di crittografia quando l'utente effettua il logout
      cryptoService.clearKey();
      
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      // Inizializza la chiave di crittografia dalla password e username
      cryptoService.initializeKey(data.password, data.username);
      
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Registrazione completata",
        description: "Crittografia AES-256 inizializzata",
      });
    },
    onError: () => {
      // Pulisci la chiave in caso di errore di registrazione
      cryptoService.clearKey();
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}