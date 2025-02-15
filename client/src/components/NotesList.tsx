import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Note } from "@shared/schema";
import { decryptText } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { NoteViewer } from "./NoteViewer";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NotesList() {
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  if (isLoading) {
    return <div>Caricamento note...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Le tue note</h2>
      <div className="grid gap-4">
        {notes.map((note) => (
          <Dialog key={note.id}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => setSelectedNoteId(note.id)}
              >
                <div>
                  <div className="font-bold">{note.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              {selectedNoteId === note.id && (
                <NoteViewer
                  noteId={note.id}
                  onClose={() => setSelectedNoteId(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
