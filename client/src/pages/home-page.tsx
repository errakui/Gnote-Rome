import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Note, type Attachment } from "@shared/schema";
import { useForm } from "react-hook-form";
import { encryptText, decryptText, encryptFile } from "@/lib/crypto";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Loader2, Lock, Shield, Binary, Image, Video, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { NoteViewer } from "@/components/NoteViewer";

type FormData = {
  title: string;
  content: string;
  attachments?: File[];
};

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [showNoteViewer, setShowNoteViewer] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    defaultValues: {
      title: '',
      content: '',
      attachments: []
    }
  });

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      attachments?: Attachment[];
    }) => {
      const res = await apiRequest("POST", "/api/notes", data);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setPreviewFiles([]);
      form.reset();
      toast({
        title: "Successo",
        description: "Nota salvata con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nel salvataggio della nota",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (formData: FormData) => {
    try {
      if (!formData.title || !formData.content) {
        toast({
          title: "Errore",
          description: "Titolo e contenuto sono obbligatori",
          variant: "destructive"
        });
        return;
      }

      if (!user) {
        toast({
          title: "Errore",
          description: "Devi essere autenticato per creare una nota",
          variant: "destructive"
        });
        return;
      }

      const encryptedContent = encryptText(formData.content, user.password);

      let attachments: Attachment[] = [];
      if (formData.attachments && formData.attachments.length > 0) {
        attachments = await Promise.all(
          formData.attachments.map(async (file: File) => {
            try {
              const encryptedData = await encryptFile(file, user.password);
              return {
                type: file.type.startsWith('image/') ? ('image' as const) : ('video' as const),
                data: encryptedData.data,
                fileName: file.name,
                mimeType: file.type
              };
            } catch (error) {
              console.error('Errore nella crittografia del file:', error);
              throw new Error(`Errore nel processare il file ${file.name}`);
            }
          })
        );
      }

      await createNoteMutation.mutateAsync({
        title: formData.title,
        content: encryptedContent,
        attachments: attachments.length > 0 ? attachments : undefined
      });

    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nel salvataggio della nota",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "File troppo grande",
          description: `Il file ${file.name} supera il limite di 10MB`,
          variant: "destructive"
        });
        return false;
      }
      return file.type.startsWith('image/') || file.type.startsWith('video/');
    });

    if (validFiles.length !== files.length) {
      const invalidCount = files.length - validFiles.length;
      toast({
        title: "File non validi",
        description: `${invalidCount} file sono stati ignorati perché non supportati o troppo grandi`,
        variant: "destructive"
      });
    }

    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPreviewFiles(prev => [...prev, ...newPreviews]);
    const currentFiles = form.getValues('attachments') || [];
    form.setValue('attachments', [...currentFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setPreviewFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });

    const currentFiles = form.getValues('attachments') || [];
    form.setValue(
      'attachments',
      currentFiles.filter((_, i) => i !== index)
    );
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
    <div className="min-h-screen bg-black text-white font-mono">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-lg font-bold">GNOTE v1.0</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              USER: {user?.username}
            </span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <Lock className="h-6 w-6" />
            <h2 className="text-xl font-bold">NOTE CRIPTATE</h2>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-zinc-200">
                <Plus className="mr-2 h-4 w-4" />
                NUOVA NOTA
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="font-mono text-white">CREA NUOVA NOTA CRIPTATA</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">TITOLO</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    className="bg-black border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">CONTENUTO</Label>
                  <Textarea
                    id="content"
                    {...form.register("content")}
                    rows={5}
                    className="bg-black border-zinc-700 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>MEDIA</Label>
                  <div
                    className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-2">
                        <Image className="h-6 w-6" />
                        <Video className="h-6 w-6" />
                      </div>
                      <p className="text-sm text-zinc-400">
                        CLICCA PER AGGIUNGERE IMMAGINI O VIDEO
                      </p>
                    </div>
                  </div>

                  {previewFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {previewFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          {file.file.type.startsWith('image/') ? (
                            <img
                              src={file.preview}
                              alt={file.file.name}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          ) : (
                            <video
                              src={file.preview}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={createNoteMutation.isPending}
                >
                  {createNoteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Binary className="mr-2 h-4 w-4" />
                  )}
                  SALVA NOTA
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors"
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setShowNoteViewer(true);
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>{note.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user && (
                      <>
                        <p className="whitespace-pre-wrap font-mono text-zinc-300 mb-4 line-clamp-3">
                          {note.content ? decryptText(note.content, user.password) : ''}
                        </p>
                        {note.attachments && note.attachments.length > 0 && (
                          <div className="flex gap-2 text-sm text-zinc-400">
                            {note.attachments.some(a => a.type === 'image') && (
                              <div className="flex items-center gap-1">
                                <Image className="h-4 w-4" />
                                <span>
                                  {note.attachments.filter(a => a.type === 'image').length}
                                </span>
                              </div>
                            )}
                            {note.attachments.some(a => a.type === 'video') && (
                              <div className="flex items-center gap-1">
                                <Video className="h-4 w-4" />
                                <span>
                                  {note.attachments.filter(a => a.type === 'video').length}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 bg-zinc-900 border-zinc-800">
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
          {notes.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              <Lock className="h-12 w-12 mx-auto mb-4" />
              <p className="font-mono">NESSUNA NOTA TROVATA</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}