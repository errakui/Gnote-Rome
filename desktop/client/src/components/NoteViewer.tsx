import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CryptoService } from "@/lib/cryptoService";
import {
  Trash2,
  Edit2,
  Save,
  X,
  Plus,
  Loader2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Props {
  noteId: number;
  onClose: () => void;
}

export function NoteViewer({ noteId, onClose }: Props) {
  const { toast } = useToast();
  const cryptoService = CryptoService.getInstance();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);

  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error('Failed to fetch note');
        }
        
        const encryptedNote = await res.json();
        
        // Decrittografia della nota
        if (cryptoService.hasKey()) {
          try {
            // Decrittografiamo titolo e contenuto
            if (encryptedNote.title && encryptedNote.title.startsWith('ENC:')) {
              encryptedNote.title = cryptoService.decrypt(encryptedNote.title.substring(4));
            }
            
            if (encryptedNote.content && encryptedNote.content.startsWith('ENC:')) {
              encryptedNote.content = cryptoService.decrypt(encryptedNote.content.substring(4));
            }
            
            // Decrittografiamo gli allegati
            if (encryptedNote.attachments && encryptedNote.attachments.length > 0) {
              encryptedNote.attachments = encryptedNote.attachments.map(attachment => {
                if (attachment.url && attachment.url.startsWith('ENC:')) {
                  return {
                    ...attachment,
                    url: cryptoService.decryptFile(attachment.url.substring(4))
                  };
                }
                return attachment;
              });
            }
          } catch (error) {
            console.error('Errore nella decrittazione:', error);
            toast({
              title: "Errore di decrittazione",
              description: "Impossibile decrittare la nota. La chiave potrebbe non essere valida.",
              variant: "destructive",
            });
          }
        }
        
        return encryptedNote;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!noteId && cryptoService.hasKey(),
  });

  // Attivazione autosalvataggio quando è in modalità di modifica
  useEffect(() => {
    if (isEditing) {
      const interval = setInterval(() => {
        if (editTitle.trim() && editContent.trim() && 
            (editTitle !== note?.title || editContent !== note?.content)) {
          saveNote();
        }
      }, 30000); // Salvataggio automatico ogni 30 secondi
      setAutoSaveInterval(interval);
    } else {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    }

    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [isEditing, editTitle, editContent]);

  // Inizializza i campi di modifica quando la nota viene caricata
  useEffect(() => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      if (note.createdAt) {
        setLastSaved(new Date(note.createdAt));
      }
    }
  }, [note]);

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; files?: File[] }) => {
      try {
        const filePromises = data.files?.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              // Criptazione del file
              const fileData = reader.result as string;
              const encryptedUrl = cryptoService.hasKey() 
                ? `ENC:${cryptoService.encryptFile(fileData)}`
                : fileData;
                
              resolve({
                type: file.type.startsWith("image/") ? "image" : "video",
                url: encryptedUrl,
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                source: "note" // Aggiungiamo l'attributo source per indicare che è un allegato di una nota
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }) || [];

        const attachments = await Promise.all(filePromises);
        
        // Criptazione dei dati prima dell'invio
        let encryptedTitle = data.title.trim();
        let encryptedContent = data.content.trim();
        
        if (cryptoService.hasKey()) {
          encryptedTitle = `ENC:${cryptoService.encrypt(encryptedTitle)}`;
          encryptedContent = `ENC:${cryptoService.encrypt(encryptedContent)}`;
        }

        // Filtriamo gli allegati esistenti per mantenere solo quelli di tipo "note" o senza source specificato
        const existingAttachments = note?.attachments?.filter(a => a.source === "note" || !a.source) || [];

        const res = await apiRequest("PATCH", `/api/notes/${noteId}`, {
          title: encryptedTitle,
          content: encryptedContent,
          attachments: attachments.length > 0 ? [...attachments, ...existingAttachments] : existingAttachments
        });

        if (!res.ok) throw new Error(await res.text());
        return res.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setLastSaved(new Date());
      if (!isEditing) {
        setPreviewFiles([]);
      }
      toast({ title: "Successo", description: "Nota aggiornata" });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
    },
  });

  const saveNote = () => {
    updateMutation.mutate({
      title: editTitle,
      content: editContent,
      files: previewFiles.map(pf => pf.file)
    });
  };

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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/notes/${noteId}`);
      if (!res.ok) throw new Error("Errore durante l'eliminazione");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      onClose();
      toast({ title: "Successo", description: "Nota eliminata" });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !note) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Filtriamo gli allegati per mostrare solo quelli di tipo "note" o senza source (per retrocompatibilità)
  const noteAttachments = note.attachments?.filter(a => a.source === "note" || !a.source) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header fisso */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3 sm:p-4 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {!isEditing ? (
              <h2 className="text-base sm:text-xl font-bold truncate mr-2">{note.title}</h2>
            ) : (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-base sm:text-xl font-bold bg-zinc-800 border-zinc-700 min-w-0"
                placeholder="Titolo della nota..."
              />
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isEditing ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Modifica
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Elimina
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={saveNote} 
                  disabled={updateMutation.isPending}
                  className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                  ) : (
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  Salva
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(note.title);
                    setEditContent(note.content);
                    setPreviewFiles([]);
                  }}
                  className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Annulla
                </Button>
              </>
            )}
          </div>
        </div>
        {lastSaved && (
          <div className="text-xs text-zinc-500 flex items-center mt-1">
            <Clock className="h-3 w-3 mr-1" />
            Ultimo salvataggio: {format(lastSaved, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
          </div>
        )}
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-16 sm:pb-20">
        {isEditing ? (
          <div className="space-y-4 sm:space-y-6">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[50vh] sm:min-h-[60vh] text-sm sm:text-lg bg-zinc-800 border-zinc-700"
              placeholder="Contenuto della nota..."
              autoFocus
            />

            <div className="sticky bottom-4 bg-zinc-900 p-3 sm:p-4 border border-zinc-800 rounded-lg shadow-lg">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  {previewFiles.map(({ file, preview }, index) => (
                    <div key={index} className="relative">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={preview}
                          alt={file.name}
                          className="w-full h-24 sm:h-40 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={preview}
                          className="w-full h-24 sm:h-40 object-cover rounded-lg"
                          controls
                        />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                {note.content}
              </div>
            </div>

            {noteAttachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mt-4 sm:mt-6">
                {noteAttachments.map((attachment, index) => (
                  <div key={index} className="relative group">
                    {attachment.type === "image" ? (
                      <img
                        src={attachment.url}
                        alt={attachment.fileName}
                        className="w-full rounded-lg transition-transform hover:scale-105"
                      />
                    ) : (
                      <video
                        src={attachment.url}
                        controls
                        className="w-full rounded-lg"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 p-2 text-xs sm:text-sm text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {attachment.fileName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa nota?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="mt-0">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}