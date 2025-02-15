import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { decryptText, decryptFile } from "@/lib/crypto";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Props {
  noteId: number;
  onClose: () => void;
}

export function NoteViewer({ noteId, onClose }: Props) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: note } = useQuery<Note>({
    queryKey: [`/api/notes/${noteId}`],
    enabled: !!noteId,
    onSuccess: (note) => {
      if (!isEditing) {
        try {
          setTitle(note.title);
          const decrypted = decryptText(note.content, note.userId.toString());
          setContent(decrypted);
          console.log("Note decrypted successfully");
        } catch (error) {
          console.error("Failed to decrypt note:", error);
          toast({
            title: "Errore",
            description: "Impossibile decrittare la nota",
            variant: "destructive",
          });
        }
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Note>) => {
      const response = await apiRequest("PATCH", `/api/notes/${noteId}`, data);
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

  const handleSave = async () => {
    if (!note) return;

    try {
      const encrypted = encryptText(content, note.userId.toString());
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

  if (!note) {
    return <div>Nota non trovata</div>;
  }

  return (
    <div className="space-y-4">
      {isEditing ? (
        <>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenuto"
            rows={10}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              Salva
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updateMutation.isPending}
            >
              Annulla
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold">{note.title}</h2>
          <div className="whitespace-pre-wrap">{content}</div>
          {note.attachments?.map((attachment, index) => {
            if (attachment.type === "image") {
              try {
                const decryptedData = decryptFile(
                  attachment.data,
                  note.userId.toString()
                );
                return (
                  <div key={index} className="mt-4">
                    <img
                      src={`data:${attachment.mimeType};base64,${decryptedData}`}
                      alt={attachment.fileName}
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {attachment.fileName}
                    </p>
                  </div>
                );
              } catch (error) {
                console.error("Failed to decrypt attachment:", error);
                return (
                  <div key={index} className="text-red-500">
                    Errore nel caricamento dell'immagine
                  </div>
                );
              }
            }
            return null;
          })}
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setIsEditing(true)}>Modifica</Button>
            <Button variant="outline" onClick={onClose}>
              Chiudi
            </Button>
          </div>
        </>
      )}
    </div>
  );
}