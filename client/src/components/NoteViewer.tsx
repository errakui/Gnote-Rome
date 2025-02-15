import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { decryptText, decryptFile, encryptText } from "@/lib/crypto";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Edit, X, Save, Image, Film } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: note, isLoading } = useQuery<Note>({
    queryKey: [`/api/notes/${noteId}`],
    onSuccess: (note) => {
      if (!isEditing) {
        try {
          setTitle(note.title);
          const decrypted = decryptText(note.content, user!.password);
          setContent(decrypted);
        } catch (error) {
          console.error("Failed to decrypt note:", error);
          toast({
            title: "Errore",
            description: "Impossibile decrittare la nota",
            variant: "destructive",
          });
        }
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Note>) => {
      const response = await apiRequest("PATCH", `/api/notes/${noteId}`, data);
      if (!response.ok) {
        throw new Error("Errore durante l'aggiornamento della nota");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${noteId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setIsEditing(false);
      toast({
        title: "Successo",
        description: "Nota aggiornata",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/notes/${noteId}`);
      if (!response.ok) {
        throw new Error("Errore durante l'eliminazione della nota");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      onClose();
      toast({
        title: "Successo",
        description: "Nota eliminata",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!note || !user) return;

    try {
      const encrypted = encryptText(content, user.password);
      await updateMutation.mutateAsync({
        title,
        content: encrypted,
      });
    } catch (error) {
      console.error("Failed to save note:", error);
      toast({
        title: "Errore",
        description: "Errore durante il salvataggio",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  if (!note) {
    return <div>Nota non trovata</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo"
              className="text-2xl font-bold"
            />
          ) : (
            note.title
          )}
        </h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salva
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
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
          placeholder="Contenuto"
          rows={10}
        />
      ) : (
        <div className="whitespace-pre-wrap">{content}</div>
      )}

      {note.attachments?.map((attachment, index) => {
        try {
          const decryptedData = decryptFile(
            attachment.data,
            user!.password
          );

          return (
            <div key={index} className="mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                {attachment.type === 'image' ? (
                  <Image className="h-4 w-4" />
                ) : (
                  <Film className="h-4 w-4" />
                )}
                {attachment.fileName}
              </div>

              {attachment.type === 'image' ? (
                <img
                  src={`data:${attachment.mimeType};base64,${decryptedData}`}
                  alt={attachment.fileName}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              ) : (
                <video
                  src={`data:${attachment.mimeType};base64,${decryptedData}`}
                  controls
                  className="max-w-full rounded-lg shadow-lg"
                />
              )}
            </div>
          );
        } catch (error) {
          console.error("Failed to decrypt attachment:", error);
          return (
            <div key={index} className="text-red-500">
              Errore nel caricamento del media
            </div>
          );
        }
      })}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La nota verrà eliminata permanentemente.
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