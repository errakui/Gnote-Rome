import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Note } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Loader2, Lock, Image, Video, X, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { NoteViewer } from "@/components/NoteViewer";
import { z } from "zod";
import { useLocation } from "wouter";
import { CryptoService } from "@/lib/cryptoService";

// Importazione del logo
import logoImage from '../../media/GLOGO.png';

const formSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").trim(),
  content: z.string().min(1, "Il contenuto è obbligatorio").trim(),
});

type FormData = z.infer<typeof formSchema>;

export default function NotesPage() {
  const { user, logoutMutation } = useAuth();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [showNoteViewer, setShowNoteViewer] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const { toast } = useToast();
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [, navigate] = useLocation();
  const cryptoService = CryptoService.getInstance();
  const isEncrypted = cryptoService.hasKey();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: ''
    }
  });

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; attachments: any[] }) => {
      if (!user?.id) throw new Error("Errore di autenticazione");

      // Criptazione dei dati prima dell'invio
      let encryptedTitle = data.title.trim();
      let encryptedContent = data.content.trim();
      let encryptedAttachments = [...data.attachments];
      
      if (cryptoService.hasKey()) {
        // Criptiamo titolo e contenuto
        encryptedTitle = `ENC:${cryptoService.encrypt(encryptedTitle)}`;
        encryptedContent = `ENC:${cryptoService.encrypt(encryptedContent)}`;
        
        // Criptiamo gli allegati
        if (encryptedAttachments.length > 0) {
          encryptedAttachments = encryptedAttachments.map(attachment => ({
            ...attachment,
            url: attachment.url.startsWith('ENC:') 
              ? attachment.url 
              : `ENC:${cryptoService.encryptFile(attachment.url)}`
          }));
        }
      }

      const res = await apiRequest("POST", "/api/notes", {
        title: encryptedTitle,
        content: encryptedContent,
        attachments: encryptedAttachments
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Errore sconosciuto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setPreviewFiles([]);
      form.reset();
      setShowCreateNote(false);
      toast({
        title: "Successo",
        description: "Nota salvata con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: "File troppo grande",
          description: `Il file ${file.name} supera il limite di 5MB`,
          variant: "destructive",
        });
        return false;
      }
      return file.type.startsWith("image/") || file.type.startsWith("video/");
    });

    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPreviewFiles(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setPreviewFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (data: FormData) => {
    const trimmedTitle = data.title.trim();
    const trimmedContent = data.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast({
        title: "Errore",
        description: "Titolo e contenuto sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    try {
      const attachmentPromises = previewFiles.map(async ({ file }) => {
        return new Promise<{
          type: "image" | "video";
          url: string;
          fileName: string;
          mimeType: string;
          size: number;
          source: string;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            // Prepariamo i dati, la crittografia avverrà nella mutation
            resolve({
              type: file.type.startsWith("image/") ? "image" : "video",
              url: reader.result as string,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
              source: "note" // Aggiungiamo il campo source per indicare che è un allegato di una nota
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const attachments = await Promise.all(attachmentPromises);

      createNoteMutation.mutate({
        title: trimmedTitle,
        content: trimmedContent,
        attachments
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nel processamento dei file",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-white" />
          <p className="text-white font-mono">CARICAMENTO...</p>
        </div>
      </div>
    );
  }

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate("/")} className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold font-mono mt-2 sm:mt-0 sm:ml-4">LE TUE NOTE</h2>
          </div>
          <Button onClick={() => setShowCreateNote(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            NUOVA NOTA
          </Button>
        </div>

        <Dialog open={showCreateNote} onOpenChange={setShowCreateNote}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold">Nuova Nota</h2>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titolo</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  {form.formState.errors.title && (
                    <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Contenuto</Label>
                  <Textarea
                    id="content"
                    {...form.register("content")}
                    className="min-h-[200px] bg-zinc-800 border-zinc-700"
                  />
                  {form.formState.errors.content && (
                    <p className="text-red-500 text-sm">{form.formState.errors.content.message}</p>
                  )}
                </div>

                <input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 sm:p-6 text-center hover:border-zinc-500">
                    <Plus className="mx-auto h-8 sm:h-12 w-8 sm:w-12 text-zinc-400" />
                    <p className="mt-2 text-xs sm:text-sm text-zinc-400">
                      Aggiungi media (max 5MB per file)
                    </p>
                  </div>
                </label>

                {previewFiles.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {previewFiles.map(({ file, preview }, index) => (
                      <div key={index} className="relative">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={preview}
                            alt={file.name}
                            className="w-full h-32 sm:h-40 object-cover rounded-lg"
                          />
                        ) : (
                          <video
                            src={preview}
                            className="w-full h-32 sm:h-40 object-cover rounded-lg"
                            controls
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createNoteMutation.isPending}
                >
                  {createNoteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Salva Nota
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Dialog
              key={note.id}
              open={showNoteViewer && selectedNoteId === note.id}
              onOpenChange={(open) => {
                setShowNoteViewer(open);
                if (!open) setSelectedNoteId(null);
              }}
            >
              <DialogTrigger asChild>
                <Card
                  className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors transform hover:scale-[1.01] duration-200 h-auto"
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setShowNoteViewer(true);
                  }}
                >
                  <CardHeader className="pb-2 p-3 sm:p-4">
                    <CardTitle className="font-mono flex items-center space-x-2 text-sm sm:text-base">
                      <Lock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{note.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <p className="whitespace-pre-wrap font-mono text-zinc-300 mb-3 sm:mb-4 line-clamp-3 text-xs sm:text-sm">
                      {note.content || 'Nessun contenuto'}
                    </p>
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="flex gap-2 text-xs sm:text-sm text-zinc-400">
                        {/* Filtriamo per mostrare solo gli allegati di tipo "note" o senza source specificato (per retrocompatibilità) */}
                        {note.attachments.filter(a => a.source === "note" || !a.source).some(a => a.type === 'image') && (
                          <div className="flex items-center gap-1">
                            <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>
                              {note.attachments.filter(a => (a.source === "note" || !a.source) && a.type === 'image').length}
                            </span>
                          </div>
                        )}
                        {note.attachments.filter(a => a.source === "note" || !a.source).some(a => a.type === 'video') && (
                          <div className="flex items-center gap-1">
                            <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>
                              {note.attachments.filter(a => (a.source === "note" || !a.source) && a.type === 'video').length}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-zinc-900">
                {selectedNoteId === note.id && (
                  <NoteViewer
                    noteId={note.id}
                    onClose={() => {
                      setShowNoteViewer(false);
                      setSelectedNoteId(null);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          ))}
        </div>

        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-zinc-900 p-6 rounded-lg max-w-md mx-auto">
              <h3 className="text-xl font-bold mb-2">Nessuna nota trovata</h3>
              <p className="text-zinc-400 mb-6">Crea la tua prima nota per iniziare</p>
              <Button onClick={() => setShowCreateNote(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea nota
              </Button>
            </div>
          </div>
        )}
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