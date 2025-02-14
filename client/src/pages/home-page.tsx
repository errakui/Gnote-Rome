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
import { insertNoteSchema, type Note, type Attachment } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { encryptText, decryptText, encryptFile, decryptFile } from "@/lib/crypto";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Loader2, Lock, Shield, Binary, Image, Video, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";

type FormData = {
  title: string;
  content: string;
  attachments?: File[];
};

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(insertNoteSchema),
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
      try {
        const res = await apiRequest("POST", "/api/notes", data);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }
        return res.json();
      } catch (error) {
        console.error("Errore nella mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setPreviewFiles([]);
      form.reset();
      toast({
        title: "Nota salvata",
        description: "La nota è stata salvata con successo",
      });
    },
    onError: (error: Error) => {
      console.error("Errore durante il salvataggio:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il salvataggio della nota",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Verifica dimensione massima totale (10MB)
      const totalSize = (data.attachments || []).reduce((acc, file) => acc + file.size, 0);
      if (totalSize > 10 * 1024 * 1024) {
        throw new Error("La dimensione totale degli allegati non può superare 10MB");
      }

      // Encrypt content
      const encryptedContent = encryptText(data.content, user!.password);

      // Process attachments with size check
      const attachments = await Promise.all(
        (data.attachments || []).map(async (file: File) => {
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`Il file ${file.name} supera la dimensione massima di 5MB`);
          }

          try {
            const encryptedData = await encryptFile(file, user!.password);
            const fileType = file.type.startsWith('image/') ? ('image' as const) : ('video' as const);

            return {
              type: fileType,
              data: encryptedData.data,
              fileName: file.name,
              mimeType: file.type
            } satisfies Attachment;
          } catch (error) {
            console.error(`Errore durante la crittografia del file ${file.name}:`, error);
            throw new Error(`Errore durante la crittografia del file ${file.name}`);
          }
        })
      );

      await createNoteMutation.mutateAsync({
        title: data.title,
        content: encryptedContent,
        attachments
      });

    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante il salvataggio della nota",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Verifica dimensione massima totale inclusi i file esistenti
    const currentFiles = form.getValues('attachments') || [];
    const totalSize = [...currentFiles, ...files].reduce((acc, file) => acc + file.size, 0);

    if (totalSize > 10 * 1024 * 1024) {
      toast({
        title: "File troppo grandi",
        description: "La dimensione totale degli allegati non può superare 10MB",
        variant: "destructive"
      });
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({
          title: "File non supportato",
          description: `Il file ${file.name} non è un'immagine o un video`,
          variant: "destructive"
        });
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File troppo grande",
          description: `Il file ${file.name} supera la dimensione massima di 5MB`,
          variant: "destructive"
        });
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      const newPreviews = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      setPreviewFiles(prev => [...prev, ...newPreviews]);
      form.setValue('attachments', [...currentFiles, ...validFiles]);
    }
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
          <p className="text-white font-mono">INITIALIZING SYSTEM...</p>
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
            <h2 className="text-xl font-bold">ENCRYPTED DOCUMENTS</h2>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-zinc-200">
                <Plus className="mr-2 h-4 w-4" />
                NEW DOCUMENT
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="font-mono text-white">CREATE NEW ENCRYPTED DOCUMENT</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                  {form.formState.errors.content && (
                    <p className="text-red-500 text-sm">{form.formState.errors.content.message?.toString()}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>ALLEGATI</Label>
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
                        CLICK TO ADD IMAGES OR VIDEOS
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
                  CRIPTA E SALVA
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="font-mono flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>{note.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap font-mono text-zinc-300 mb-4">
                  {decryptText(note.content, user!.password)}
                </p>

                {note.attachments && note.attachments.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {note.attachments.map((attachment, index) => {
                      const decryptedData = decryptFile(attachment.data, user!.password);
                      const dataUrl = `data:${attachment.mimeType};base64,${decryptedData}`;

                      return attachment.type === 'image' ? (
                        <img
                          key={index}
                          src={dataUrl}
                          alt={attachment.fileName}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          key={index}
                          src={dataUrl}
                          controls
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              <Lock className="h-12 w-12 mx-auto mb-4" />
              <p className="font-mono">NO ENCRYPTED DOCUMENTS FOUND</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

type InsertNote = {
  title: string;
  content: string;
  attachments: Attachment[];
};