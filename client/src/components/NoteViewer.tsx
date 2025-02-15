import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { decryptText, decryptFile, encryptText } from "@/lib/crypto";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Edit2, Save, X } from "lucide-react";
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

  const { data: note } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/notes/${noteId}`);
      if (!res.ok) throw new Error("Errore nel recupero della nota");
      return res.json();
    },
  });

  // Carica il contenuto decifrato quando la nota viene caricata
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
    mutationFn: async (newContent: string) => {
      if (!user) throw new Error("Utente non autenticato");
      const encryptedContent = encryptText(newContent, user.password);
      const res = await apiRequest("PATCH", `/api/notes/${noteId}`, {
        content: encryptedContent,
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setIsEditing(false);
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
    updateMutation.mutate(content);
  };

  if (!note || !user) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{note.title}</h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salva
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline">
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

      {isEditing ? (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[300px] text-lg"
        />
      ) : (
        <div className="whitespace-pre-wrap text-lg bg-zinc-800 rounded-lg p-6">
          {content}
        </div>
      )}

      {note.attachments && note.attachments.length > 0 && (
        <div className="space-y-4 mt-8">
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
                        className="w-full rounded-lg border border-zinc-700"
                      />
                    ) : (
                      <video
                        src={`data:${attachment.mimeType};base64,${decryptedData}`}
                        controls
                        className="w-full rounded-lg border border-zinc-700"
                      />
                    )}
                  </div>
                );
              } catch (error) {
                console.error("Errore decrittazione allegato:", error);
                return (
                  <div key={index} className="p-4 border border-red-500 rounded-lg text-red-500">
                    Errore nel caricamento del file
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

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