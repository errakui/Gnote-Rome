import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { decryptText, decryptFile, encryptText, encryptFile } from "@/lib/crypto";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Edit2, Save, X, Plus, X as XIcon, Loader2 } from "lucide-react";
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
  const [editContent, setEditContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ content, files }: { content: string; files?: File[] }) => {
      if (!user?.password) throw new Error("Utente non autenticato");

      let newAttachments = [];
      if (files?.length) {
        newAttachments = await Promise.all(
          files.map(async (file) => {
            const encrypted = await encryptFile(file, user.password);
            return {
              type: file.type.startsWith('image/') ? 'image' : 'video',
              data: encrypted.data,
              fileName: file.name,
              mimeType: file.type
            };
          })
        );
      }

      const res = await apiRequest("PATCH", `/api/notes/${noteId}`, {
        content: encryptText(content, user.password),
        attachments: [...(note?.attachments || []), ...newAttachments]
      });

      if (!res.ok) throw new Error("Errore durante l'aggiornamento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId] });
      setIsEditing(false);
      setAttachments([]);
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

  const handleSave = () => {
    if (!editContent.trim()) {
      toast({
        title: "Errore",
        description: "Il contenuto non può essere vuoto",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ content: editContent, files: attachments });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB

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

    setAttachments(prev => [...prev, ...validFiles]);
  };

  useEffect(() => {
    if (note && user?.password) {
      try {
        const decryptedContent = decryptText(note.content, user.password);
        setEditContent(decryptedContent);
      } catch (error) {
        console.error("Errore decrittazione:", error);
        toast({
          title: "Errore",
          description: "Impossibile decrittare la nota",
          variant: "destructive",
        });
      }
    }
  }, [note, user]);


  if (isLoading || !note || !user?.password) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const decryptedContent = decryptText(note.content, user.password);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-6 border-b border-zinc-800">
        <h2 className="text-2xl font-bold">{note.title}</h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salva
              </Button>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditContent(decryptedContent);
                setAttachments([]);
              }}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(true);
                setEditContent(decryptedContent);
              }}>
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
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[300px] text-lg"
              placeholder="Contenuto della nota..."
            />

            <div>
              <input
                type="file"
                className="hidden"
                id="file-upload"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400">
                  <Plus className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Aggiungi media</p>
                </div>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {attachments.map((file, index) => (
                  <div key={index} className="relative">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full h-40 object-cover rounded-lg"
                        controls
                      />
                    )}
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
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
          <div className="space-y-6">
            <div className="whitespace-pre-wrap text-lg">
              {decryptedContent}
            </div>

            {note.attachments && note.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {note.attachments.map((attachment, index) => {
                  try {
                    const decryptedData = decryptFile(attachment.data, user.password);
                    return (
                      <div key={index}>
                        {attachment.type === 'image' ? (
                          <img
                            src={`data:${attachment.mimeType};base64,${decryptedData}`}
                            alt={attachment.fileName}
                            className="w-full rounded-lg"
                          />
                        ) : (
                          <video
                            src={`data:${attachment.mimeType};base64,${decryptedData}`}
                            controls
                            className="w-full rounded-lg"
                          />
                        )}
                      </div>
                    );
                  } catch (error) {
                    console.error("Errore decriptazione allegato:", error);
                    return null;
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
              Sei sicuro di voler eliminare questa nota?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
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