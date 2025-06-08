import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { CryptoService } from "@/lib/cryptoService";

// Importazione delle immagini personalizzate
import noteImage from '../../media/note.png';
import galleriaImage from '../../media/galleria.png';
import logoImage from '../../media/GLOGO.png';

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const cryptoService = CryptoService.getInstance();
  const isEncrypted = cryptoService.hasKey();

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col">
      <header className="border-b border-zinc-800 sticky top-0 z-10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <img src={logoImage} alt="Ghub Logo" className="h-10 sm:h-12 md:h-16 w-auto" />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col xs:flex-row items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-zinc-400 truncate max-w-[100px] sm:max-w-full">
                USER: {user?.username}
              </span>
              {isEncrypted && (
                <span className="text-xs bg-green-800 text-white px-1 sm:px-2 py-0.5 rounded">
                  AES-256
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              className="hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-grow">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold font-mono">BENVENUTO IN GHUB</h2>
        </div>

        <div className="grid gap-4 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
          <Card 
            className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors transform hover:scale-[1.01] duration-200"
            onClick={() => navigate("/notes")}
          >
            <CardHeader className="flex flex-row items-center justify-center pt-4 sm:pt-6">
              <img src={noteImage} alt="Note" className="h-16 sm:h-20 md:h-24 w-auto object-contain" />
            </CardHeader>
            <CardContent className="text-center pt-3 sm:pt-4 pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl mb-2 sm:mb-4">NOTE</CardTitle>
              <p className="text-zinc-400 text-sm sm:text-base">
                Crea, visualizza e gestisci le tue note
              </p>
              <Button className="mt-4 sm:mt-6 w-full" onClick={() => navigate("/notes")}>
                Accedi alle note
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors transform hover:scale-[1.01] duration-200"
            onClick={() => navigate("/gallery")}
          >
            <CardHeader className="flex flex-row items-center justify-center pt-4 sm:pt-6">
              <img src={galleriaImage} alt="Galleria" className="h-16 sm:h-20 md:h-24 w-auto object-contain" />
            </CardHeader>
            <CardContent className="text-center pt-3 sm:pt-4 pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl mb-2 sm:mb-4">GALLERIA</CardTitle>
              <p className="text-zinc-400 text-sm sm:text-base">
                Gestisci, visualizza e organizza le tue immagini
              </p>
              <Button className="mt-4 sm:mt-6 w-full" onClick={() => navigate("/gallery")}>
                Accedi alla galleria
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-zinc-500">
            Ghub v1.0 {isEncrypted ? "- Crittografia AES-256 Attiva" : ""}
          </p>
        </div>
      </footer>
    </div>
  );
}