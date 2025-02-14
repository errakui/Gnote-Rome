import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertNoteSchema, type Note } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { encryptText, decryptText } from "@/lib/crypto";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Loader2, Lock, Shield, Binary } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const form = useForm({
    resolver: zodResolver(insertNoteSchema),
  });

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const encryptedContent = encryptText(data.content, user!.password);
      const res = await apiRequest("POST", "/api/notes", {
        ...data,
        content: encryptedContent,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-white" />
          <p className="text-white font-mono">INITIALIZING SYSTEM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <header className="border-b border-zinc-800">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-lg font-bold">SECURE NOTES v1.0</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              USER: {user?.username}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              className="hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <Lock className="h-6 w-6" />
            <h2 className="text-xl font-bold">ENCRYPTED DOCUMENTS</h2>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-zinc-200">
                <Plus className="mr-2 h-4 w-4" />
                NEW DOCUMENT
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="font-mono text-white">CREATE NEW ENCRYPTED DOCUMENT</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit((data) => createNoteMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">TITLE</Label>
                  <Input 
                    id="title" 
                    {...form.register("title")} 
                    className="bg-black border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">CONTENT</Label>
                  <Textarea
                    id="content"
                    {...form.register("content")}
                    rows={5}
                    className="bg-black border-zinc-700 font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={createNoteMutation.isPending}
                >
                  {createNoteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Binary className="mr-2 h-4 w-4" />
                  )}
                  ENCRYPT AND SAVE
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="font-mono flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>{note.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap font-mono text-zinc-300">
                  {decryptText(note.content, user!.password)}
                </p>
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              <Lock className="h-12 w-12 mx-auto mb-4" />
              <p className="font-mono">NO ENCRYPTED DOCUMENTS FOUND</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}