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

  // Recupera la nota
  const { data: note, isLoading } = useQuery<Note>({
    queryKey: [`/api/notes/${noteId}`],
    onSuccess: (note) => {
      if (!isEditing) {
        try {
          setTitle(note.title);
          setContent(decryptText(note.content, note.userId.toString()));
        } catch (error) {
          toast({
            title: "Errore",
            description: "Impossibile decrittare la nota",
            variant: "destructive",
          });
        }
      }
    },
  });

  // Mutation per aggiornare la nota
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Note>) => {
      const res = await apiRequest("PATCH", `/api/notes/${noteId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${noteId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setIsEditing(false);
      toast({
        title: "Successo",
        description: "Nota aggiornata correttamente",
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

  // Gestisce il salvataggio delle modifiche
  const handleSave = async () => {
    if (!note) return;
    try {
      const encryptedContent = encryptText(content, note.userId.toString());
      await updateMutation.mutateAsync({
        title,
        content: encryptedContent,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il salvataggio della nota",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

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
          {note.attachments?.map((attachment, index) => (
            <div key={index} className="mt-4">
              {attachment.type === "image" && (
                <img
                  src={`data:${attachment.mimeType};base64,${decryptFile(
                    attachment.data,
                    note.userId.toString()
                  )}`}
                  alt={attachment.fileName}
                  className="max-w-full h-auto"
                />
              )}
            </div>
          ))}
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
