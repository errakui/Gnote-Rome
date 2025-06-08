import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { NoteViewer } from "./NoteViewer";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, FileText, Image as ImageIcon, Film } from "lucide-react";

export function NotesList() {
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Non hai ancora creato nessuna nota
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Le tue note</h2>
      <div className="grid gap-4">
        {notes.map((note) => (
          <Dialog 
            key={note.id} 
            open={dialogOpen && selectedNoteId === note.id}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setSelectedNoteId(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 hover:bg-accent"
                onClick={() => {
                  setSelectedNoteId(note.id);
                  setDialogOpen(true);
                }}
              >
                <div className="flex items-start gap-3 w-full">
                  <FileText className="h-5 w-5 mt-1 flex-shrink-0" />
                  <div className="flex-grow text-left">
                    <div className="font-bold">{note.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString('it-IT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {note.attachments.some(a => a.type === 'image') && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ImageIcon className="h-3 w-3" />
                            {note.attachments.filter(a => a.type === 'image').length}
                          </div>
                        )}
                        {note.attachments.some(a => a.type === 'video') && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Film className="h-3 w-3" />
                            {note.attachments.filter(a => a.type === 'video').length}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              {selectedNoteId === note.id && (
                <NoteViewer
                  noteId={note.id}
                  onClose={() => {
                    setDialogOpen(false);
                    setSelectedNoteId(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}