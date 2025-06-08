import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, LogOut, Plus, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Note } from "@shared/schema";
import { CryptoService } from "@/lib/cryptoService";

// Importazione del logo
import logoImage from '../../media/GLOGO.png';

export default function GalleryPage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string; fileName: string } | null>(null);
  const { toast } = useToast();
  const cryptoService = CryptoService.getInstance();
  const isEncrypted = cryptoService.hasKey();

  // Recupera tutte le note e poi estrae i media
  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    queryFn: async () => {
      const res = await fetch('/api/notes', {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch notes');
      }
      
      const encryptedNotes = await res.json();
      
      // Decrittografia delle note
      if (cryptoService.hasKey()) {
        try {
          // Per ogni nota, decrittografiamo gli allegati
          return encryptedNotes.map((note: any) => {
            // Decrittografiamo gli allegati
            if (note.attachments && note.attachments.length > 0) {
              note.attachments = note.attachments.map((attachment: any) => {
                if (attachment.url && attachment.url.startsWith('ENC:')) {
                  return {
                    ...attachment,
                    url: cryptoService.decryptFile(attachment.url.substring(4))
                  };
                }
                return attachment;
              });
            }
            return note;
          });
        } catch (error) {
          console.error('Errore nella decrittazione:', error);
          toast({
            title: "Errore di decrittazione",
            description: "Alcuni media potrebbero non essere visualizzati correttamente.",
            variant: "destructive",
          });
        }
      }
      
      return encryptedNotes;
    }
  });

  // Estrae solo i media caricati dalla galleria (con source "gallery" o senza source per retrocompatibilità)
  const allMedia = notes.flatMap(note => 
    note.attachments?.filter(attachment => 
      attachment.source === "gallery" || !attachment.source
    ).map(attachment => ({
      ...attachment,
      noteId: note.id,
      noteTitle: note.title
    })) || []
  );

  // Filtra solo le immagini (per ora, potremmo avere una vista separata per i video)
  const images = allMedia.filter(media => media.type === 'image');
  const videos = allMedia.filter(media => media.type === 'video');

  const uploadMediaMutation = useMutation({
    mutationFn: async (files: File[]) => {
      try {
        const filePromises = files.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const fileData = reader.result as string;
              // Criptazione del file se abbiamo la chiave
              const encryptedUrl = cryptoService.hasKey() 
                ? `ENC:${cryptoService.encryptFile(fileData)}`
                : fileData;
                
              resolve({
                type: file.type.startsWith("image/") ? "image" : "video",
                url: encryptedUrl,
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                source: "gallery" // Aggiungiamo l'attributo source per indicare che proviene dalla galleria
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        const attachments = await Promise.all(filePromises);

        // Preparazione titolo e contenuto della nota (criptati se necessario)
        const title = `Media caricati il ${new Date().toLocaleDateString()}`;
        const content = `Caricamento automatico dalla Galleria (${attachments.length} file)`;
        
        let encryptedTitle = title;
        let encryptedContent = content;
        
        if (cryptoService.hasKey()) {
          encryptedTitle = `ENC:${cryptoService.encrypt(title)}`;
          encryptedContent = `ENC:${cryptoService.encrypt(content)}`;
        }

        // Crea una nota "galleria" per archiviare i media
        const res = await apiRequest("POST", "/api/notes", {
          title: encryptedTitle,
          content: encryptedContent,
          attachments
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Errore sconosciuto");
        }
        
        return res.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setPreviewFiles([]);
      setUploadOpen(false);
      toast({
        title: "Successo",
        description: "Media caricati con successo",
      });
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

  const handleUpload = () => {
    if (previewFiles.length === 0) {
      toast({
        title: "Errore",
        description: "Seleziona almeno un file da caricare",
        variant: "destructive",
      });
      return;
    }

    uploadMediaMutation.mutate(previewFiles.map(pf => pf.file));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-white" />
          <p className="text-white font-mono">CARICAMENTO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col">
      <header className="border-b border-zinc-800 sticky top-0 z-10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <img src={logoImage} alt="Ghub Logo" className="h-10 sm:h-12 md:h-16 w-auto" />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col xs:flex-row items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-zinc-400 truncate max-w-[100px] sm:max-w-full">
                USER: {user?.username}
              </span>
              {isEncrypted && (
                <span className="text-xs bg-green-800 text-white px-1 sm:px-2 py-0.5 rounded">
                  AES-256
                </span>
              )}
            </div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate("/")} className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold font-mono mt-2 sm:mt-0 sm:ml-4">GALLERIA</h2>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            CARICA MEDIA
          </Button>
        </div>

        {/* Modal per caricare file */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Carica media</DialogTitle>
            <div className="space-y-6">
              <input
                type="file"
                className="hidden"
                id="gallery-upload"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <label htmlFor="gallery-upload" className="cursor-pointer block">
                <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 sm:p-8 text-center hover:border-zinc-500">
                  <Plus className="mx-auto h-10 sm:h-16 w-10 sm:w-16 text-zinc-400" />
                  <p className="mt-2 text-xs sm:text-sm text-zinc-400">
                    Seleziona immagini e video (max 5MB per file)
                  </p>
                </div>
              </label>

              {previewFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 sm:mt-6">
                  {previewFiles.map(({ file, preview }, index) => (
                    <div key={index} className="relative group">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={preview}
                          alt={file.name}
                          className="w-full h-28 sm:h-40 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={preview}
                          className="w-full h-28 sm:h-40 object-cover rounded-lg"
                          controls
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 z-10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleUpload}
                className="w-full mt-4 sm:mt-6"
                disabled={uploadMediaMutation.isPending || previewFiles.length === 0}
              >
                {uploadMediaMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Carica {previewFiles.length} file
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal per visualizzare i media in grande */}
        <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-1 bg-zinc-900">
            <div className="relative">
              {selectedMedia?.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.fileName}
                  className="w-full h-auto max-h-[80vh] object-contain mx-auto"
                />
              ) : selectedMedia?.type === 'video' ? (
                <video
                  src={selectedMedia.url}
                  className="w-full h-auto max-h-[80vh] mx-auto"
                  controls
                  autoPlay
                />
              ) : null}
              <Button
                className="absolute top-2 right-2"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedMedia(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Visualizzazione Galleria - Sezione Immagini */}
        <div className="mt-6 sm:mt-8">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Immagini ({images.length})</h3>
          {images.length === 0 ? (
            <div className="bg-zinc-900 rounded-lg p-6 text-center">
              <p className="text-zinc-400 mb-4">Nessuna immagine disponibile. Carica qualcosa!</p>
              <Button variant="outline" onClick={() => setUploadOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Carica immagini
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
              {images.map((image, index) => (
                <div 
                  key={index} 
                  className="relative group cursor-pointer transform hover:scale-[1.03] transition-all duration-200"
                  onClick={() => setSelectedMedia({
                    url: image.url,
                    type: 'image',
                    fileName: image.fileName
                  })}
                >
                  <img
                    src={image.url}
                    alt={image.fileName}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs truncate max-w-[90%] px-2">
                      {image.fileName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visualizzazione Galleria - Sezione Video */}
        <div className="mt-8 sm:mt-12">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Video ({videos.length})</h3>
          {videos.length === 0 ? (
            <div className="bg-zinc-900 rounded-lg p-6 text-center">
              <p className="text-zinc-400 mb-4">Nessun video disponibile. Carica qualcosa!</p>
              <Button variant="outline" onClick={() => setUploadOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Carica video
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {videos.map((video, index) => (
                <div 
                  key={index} 
                  className="relative group cursor-pointer transform hover:scale-[1.03] transition-all duration-200"
                  onClick={() => setSelectedMedia({
                    url: video.url,
                    type: 'video',
                    fileName: video.fileName
                  })}
                >
                  <video
                    src={video.url}
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 hover:bg-opacity-60 transition-all rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 sm:w-12 sm:h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-1 sm:p-2 text-xs sm:text-sm truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {video.fileName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-zinc-500">
            Ghub v1.0 {isEncrypted ? "- Crittografia AES-256 Attiva" : ""}
          </p>
        </div>
      </footer>
    </div>
  );
} 