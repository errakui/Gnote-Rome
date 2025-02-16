import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Trash2,
  Edit2,
  Save,
  X,
  Plus,
  Loader2,
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
import { useAuth } from "@/hooks/use-auth";
import { decryptText } from "@/lib/crypto";

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
  const [newAttachments, setNewAttachments] = useState<File[]>([]);

  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      content,
      files,
    }: {
      content: string;
      files?: File[];
    }) => {
      const formData = new FormData();
      formData.append('content', content);

      if (files?.length) {
        files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const res = await apiRequest("PATCH", `/api/notes/${noteId}`, formData);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Errore durante l'aggiornamento");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setIsEditing(false);
      setNewAttachments([]);
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

    setNewAttachments((prev) => [...prev, ...validFiles]);
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

  const decryptedContent = note.content ? decryptText(note.content) : 'Errore nella decrittazione';

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="flex justify-between items-center p-6 border-b border-zinc-800">
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="hover:bg-zinc-800">
                <Edit2 className="h-4 w-4 mr-2" />
                Modifica
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button onClick={() => updateMutation.mutate({
                content: editContent,
                files: newAttachments.length > 0 ? newAttachments : undefined,
              })} disabled={updateMutation.isPending}
              className="hover:bg-zinc-700">
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salva
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(decryptedContent);
                  setNewAttachments([]);
                }}
                className="hover:bg-zinc-800"
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </>
          )}
        </div>
        <Button variant="ghost" onClick={onClose} size="icon" className="hover:bg-zinc-800">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isEditing ? (
          <div className="space-y-6">
            <Textarea
              value={editContent || decryptedContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[300px] text-lg bg-zinc-800 border-zinc-700"
              placeholder="Contenuto della nota..."
            />

            <input
              type="file"
              className="hidden"
              id="file-upload"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-zinc-500">
                <Plus className="mx-auto h-12 w-12 text-zinc-400" />
                <p className="mt-2 text-sm text-zinc-400">
                  Aggiungi media (max 5MB per file)
                </p>
              </div>
            </label>

            {newAttachments.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {newAttachments.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-lg mb-8">
                {decryptedContent}
              </div>
              <h2 className="text-2xl font-bold mb-4">{note.title}</h2>
            </div>

            {note.attachments && note.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                {note.attachments.map((attachment, index) => (
                  <div key={index} className="relative group">
                    {attachment.type === "image" ? (
                      <img
                        src={attachment.url}
                        alt={attachment.fileName}
                        className="w-full rounded-lg border border-zinc-800 transition-transform hover:scale-105"
                      />
                    ) : (
                      <video
                        src={attachment.url}
                        controls
                        className="w-full rounded-lg border border-zinc-800"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa nota?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-zinc-800">Annulla</AlertDialogCancel>
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