import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { decryptText, decryptFile, encryptText, encryptFile } from "@/lib/crypto";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Edit2, Save, X, Plus, X as XIcon } from "lucide-react";
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

interface Props {
  noteId: number;
  onClose: () => void;
}

export function NoteViewer({ noteId, onClose }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [content, setContent] = useState("");
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const { data: note } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/notes/${noteId}`);
      if (!res.ok) throw new Error("Errore nel recupero della nota");
      return res.json();
    },
  });

  useEffect(() => {
    if (note && user && !isEditing) {
      try {
        setContent(decryptText(note.content, user.password));
      } catch (error) {
        console.error("Errore decrittazione:", error);
        toast({
          title: "Errore",
          description: "Impossibile decrittare la nota",
          variant: "destructive",
        });
      }
    }
  }, [note, user, isEditing]);

  const updateMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments?: File[] }) => {
      if (!user || !note) throw new Error("Utente non autenticato");

      const encryptedContent = encryptText(content, user.password);
      let finalAttachments = note.attachments || [];

      if (attachments?.length) {
        const newEncryptedAttachments = await Promise.all(
          attachments.map(async (file) => {
            const encrypted = await encryptFile(file, user.password);
            return {
              type: file.type.startsWith('image/') ? ('image' as const) : ('video' as const),
              data: encrypted.data,
              fileName: file.name,
              mimeType: file.type
            };
          })
        );
        finalAttachments = [...finalAttachments, ...newEncryptedAttachments];
      }

      const res = await apiRequest("PATCH", `/api/notes/${noteId}`, {
        content: encryptedContent,
        attachments: finalAttachments
      });

      if (!res.ok) throw new Error("Errore durante l'aggiornamento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setIsEditing(false);
      setNewAttachments([]);
      toast({
        title: "Successo",
        description: "Nota aggiornata",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/notes/${noteId}`);
      if (!res.ok) throw new Error("Errore durante l'eliminazione");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      onClose();
      toast({
        title: "Successo",
        description: "Nota eliminata",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!content.trim()) {
      toast({
        title: "Errore",
        description: "Il contenuto non può essere vuoto",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ content, attachments: newAttachments });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isSmall = file.size <= 10 * 1024 * 1024; // 10MB
      return isValid && isSmall;
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "File non validi",
        description: "Alcuni file sono stati ignorati perché non supportati o troppo grandi (max 10MB)",
        variant: "destructive"
      });
    }

    setNewAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!note || !user) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-6 border-b border-zinc-800">
        <h2 className="text-2xl font-bold">{note.title}</h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salva
              </Button>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setNewAttachments([]);
              }}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Modifica
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <div className="space-y-6">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[300px] text-lg bg-black/20"
              placeholder="Scrivi qui il contenuto della nota..."
            />

            <div 
              className="border-2 border-dashed border-zinc-800 rounded-lg p-6 cursor-pointer hover:border-zinc-700 transition-colors"
              onClick={() => fileInputRef?.click()}
            >
              <input
                type="file"
                ref={el => setFileInputRef(el)}
                className="hidden"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-2">
                <Plus className="h-8 w-8" />
                <p className="text-sm text-zinc-400">
                  Aggiungi immagini o video (max 10MB)
                </p>
              </div>
            </div>

            {newAttachments.length > 0 && (
              <div className="grid grid-cols-2 gap-6">
                {newAttachments.map((file, index) => (
                  <div key={index} className="relative group">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full rounded-lg border border-zinc-800"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full rounded-lg border border-zinc-800"
                        controls
                      />
                    )}
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="whitespace-pre-wrap text-lg bg-black/20 rounded-lg p-6">
              {content}
            </div>

            {note.attachments && note.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-6">
                {note.attachments.map((attachment, index) => {
                  try {
                    const decryptedData = decryptFile(attachment.data, user.password);
                    return (
                      <div key={index}>
                        {attachment.type === 'image' ? (
                          <img
                            src={`data:${attachment.mimeType};base64,${decryptedData}`}
                            alt={attachment.fileName}
                            className="w-full rounded-lg border border-zinc-800"
                          />
                        ) : (
                          <video
                            src={`data:${attachment.mimeType};base64,${decryptedData}`}
                            controls
                            className="w-full rounded-lg border border-zinc-800"
                          />
                        )}
                      </div>
                    );
                  } catch (error) {
                    return (
                      <div key={index} className="p-4 border border-red-500 rounded-lg text-red-500">
                        Errore nel caricamento del file
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa nota? L'azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Annulla
            </AlertDialogCancel>
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