import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

interface Props {
  noteId: number;
  onClose: () => void;
}

export function NoteViewer({ noteId, onClose }: Props) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);

  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
    enabled: !!noteId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; files?: File[] }) => {
      try {
        const filePromises = data.files?.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                type: file.type.startsWith("image/") ? "image" : "video",
                url: reader.result as string,
                fileName: file.name,
                mimeType: file.type,
                size: file.size
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }) || [];

        const attachments = await Promise.all(filePromises);

        const res = await apiRequest("PATCH", `/api/notes/${noteId}`, {
          title: data.title.trim(),
          content: data.content.trim(),
          attachments: attachments.length > 0 ? attachments : note?.attachments
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
      setIsEditing(false);
      setPreviewFiles([]);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-6 border-b">
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(true);
                  setEditTitle(note.title);
                  setEditContent(note.content);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Modifica
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => updateMutation.mutate({
                  title: editTitle,
                  content: editContent,
                  files: previewFiles.map(pf => pf.file)
                })} 
                disabled={updateMutation.isPending}
              >
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
                  setEditTitle(note.title);
                  setEditContent(note.content);
                  setPreviewFiles([]);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isEditing ? (
          <div className="space-y-6">
            <div>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold"
                placeholder="Titolo della nota..."
              />
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[300px] text-lg"
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400">
                <Plus className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Aggiungi media (max 5MB per file)
                </p>
              </div>
            </label>

            {previewFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {previewFiles.map(({ file, preview }, index) => (
                  <div key={index} className="relative">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={preview}
                        className="w-full h-40 object-cover rounded-lg"
                        controls
                      />
                    )}
                    <button
                      onClick={() => removeFile(index)}
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
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold mb-4">{note.title}</h2>
              <div className="whitespace-pre-wrap text-lg mb-8">
                {note.content}
              </div>
            </div>

            {note.attachments && note.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                {note.attachments.map((attachment, index) => (
                  <div key={index} className="relative group">
                    {attachment.type === "image" ? (
                      <img
                        src={attachment.url}
                        alt={attachment.fileName}
                        className="w-full rounded-lg border border-gray-200 transition-transform hover:scale-105"
                      />
                    ) : (
                      <video
                        src={attachment.url}
                        controls
                        className="w-full rounded-lg border border-gray-200"
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