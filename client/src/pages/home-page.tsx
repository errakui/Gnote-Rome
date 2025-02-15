import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Note, type Attachment } from "@shared/schema";
import { useForm } from "react-hook-form";
import { encryptText, encryptFile } from "@/lib/crypto";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Loader2, Lock, Shield, Binary } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type FormData = {
  title: string;
  content: string;
  attachments?: File[];
};

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormData>({
    defaultValues: {
      title: '',
      content: '',
    }
  });

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      console.log("Invio nota al server:", data);
      const res = await apiRequest("POST", "/api/notes", data);
      if (!res.ok) {
        throw new Error("Errore nel salvataggio della nota");
      }
      return res.json();
    },
    onSuccess: () => {
      console.log("Nota salvata con successo");
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      form.reset();
      toast({
        title: "Successo",
        description: "Nota salvata con successo",
      });
    },
    onError: (error) => {
      console.error("Errore nel salvataggio:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la nota",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      console.log("Tentativo di salvare la nota:", data);

      if (!data.title || !data.content) {
        toast({
          title: "Errore",
          description: "Inserisci titolo e contenuto",
          variant: "destructive"
        });
        return;
      }

      const encryptedContent = encryptText(data.content, user!.password);

      await createNoteMutation.mutateAsync({
        title: data.title,
        content: encryptedContent,
      });
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la nota",
        variant: "destructive"
      });
    }
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-xl font-bold">GNOTE</h1>
        </div>
        <div className="flex items-center gap-4">
          <span>{user?.username}</span>
          <Button onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main>
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Note Criptate
          </h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuova Nota
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuova Nota</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Titolo</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Contenuto</Label>
                  <Textarea
                    id="content"
                    {...form.register("content")}
                    rows={5}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createNoteMutation.isPending}>
                  {createNoteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Binary className="mr-2 h-4 w-4" />
                  )}
                  Salva Nota
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader>
                <CardTitle>{note.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && (
            <p className="text-center col-span-2 py-8 text-gray-500">
              Nessuna nota trovata
            </p>
          )}
        </div>
      </main>
    </div>
  );
}