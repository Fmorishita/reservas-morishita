import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subirTicket } from "@/lib/finanzas/queries";

interface SubirTicketProps {
  semanaId: string;
  onSubido: (url: string) => void;
  urlActual?: string | null;
}

export function SubirTicket({ semanaId, onSubido, urlActual }: SubirTicketProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [preview, setPreview] = useState<string | null>(urlActual ?? null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setSubiendo(true);
    try {
      const url = await subirTicket(file, semanaId);
      onSubido(url);
    } catch (err) {
      console.error("Error subiendo ticket:", err);
      setPreview(null);
    } finally {
      setSubiendo(false);
    }
  };

  const limpiar = () => {
    setPreview(null);
    onSubido("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border">
          <img src={preview} alt="Ticket" className="w-full h-full object-cover" />
          {subiendo && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {!subiendo && (
            <button
              type="button"
              onClick={limpiar}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-20 border-dashed flex flex-col gap-1 text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-5 h-5" />
          <span className="text-xs">Foto del ticket (opcional)</span>
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
