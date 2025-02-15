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
import { Loader2 } from "lucide-react";

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
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  setSelectedNoteId(note.id);
                  setDialogOpen(true);
                }}
              >
                <div>
                  <div className="font-bold">{note.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                  {note.attachments && note.attachments.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {note.attachments.length} allegati
                    </div>
                  )}
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