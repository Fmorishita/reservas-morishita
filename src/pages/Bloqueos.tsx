import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Lock, CalendarPlus } from "lucide-react";
import { BlockForm } from "@/components/BlockForm";
import { ExtraSlotForm } from "@/components/ExtraSlotForm";
import { useReservations } from "@/hooks/useReservations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIME_SLOTS, TimeSlot } from "@/types/reservation";
import { toast } from "@/hooks/use-toast";

export default function Bloqueos() {
  const { blocks, extraSlots, addBlock, removeBlock, addExtraSlot, removeExtraSlot } = useReservations();

  const handleAddBlock = async (data: {
    fecha: string;
    horario: TimeSlot | "DIA_COMPLETO";
    motivo: string | null;
  }) => {
    try {
      await addBlock(data);
      toast({ title: "Bloqueo creado", description: "El horario ha sido bloqueado exitosamente." });
    } catch {
      toast({ title: "Error", description: "No se pudo crear el bloqueo", variant: "destructive" });
    }
  };

  const handleRemoveBlock = async (id: string) => {
    try {
      await removeBlock(id);
      toast({ title: "Bloqueo eliminado", description: "El horario vuelve a estar disponible." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el bloqueo", variant: "destructive" });
    }
  };

  const handleAddExtraSlot = async (data: {
    fecha: string;
    horario: TimeSlot;
    motivo: string | null;
  }) => {
    try {
      await addExtraSlot(data);
      toast({ title: "Horario extra agregado", description: "El horario extra está disponible para reservaciones." });
    } catch {
      toast({ title: "Error", description: "No se pudo agregar el horario extra", variant: "destructive" });
    }
  };

  const handleRemoveExtraSlot = async (id: string) => {
    try {
      await removeExtraSlot(id);
      toast({ title: "Horario extra eliminado", description: "El horario extra ha sido removido." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el horario extra", variant: "destructive" });
    }
  };

  const sortedBlocks = [...blocks].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const sortedExtraSlots = [...extraSlots].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  return (
    <div className="max-w-lg mx-auto space-y-8 md:pt-14">
      <h1 className="text-2xl font-medium">Gestionar horarios</h1>

      <Tabs defaultValue="bloquear">
        <TabsList className="w-full">
          <TabsTrigger value="bloquear" className="flex-1">Bloquear</TabsTrigger>
          <TabsTrigger value="extra" className="flex-1">Horarios extra</TabsTrigger>
        </TabsList>

        {/* Tab: Bloquear */}
        <TabsContent value="bloquear" className="space-y-8 mt-6">
          <Card>
            <CardContent className="pt-6">
              <BlockForm onSubmit={handleAddBlock} />
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-medium mb-4">Bloqueos activos</h2>
            {sortedBlocks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay horarios bloqueados</p>
            ) : (
              <div className="space-y-3">
                {sortedBlocks.map((block) => {
                  const date = parseISO(block.fecha);
                  const timeLabel =
                    block.horario === "DIA_COMPLETO"
                      ? "Día completo"
                      : TIME_SLOTS.find((t) => t.value === block.horario)?.label;

                  return (
                    <Card key={block.id} className="animate-fade-in">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium capitalize">
                                {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{timeLabel}</Badge>
                                {block.motivo && (
                                  <span className="text-xs text-muted-foreground">{block.motivo}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveBlock(block.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Horarios extra */}
        <TabsContent value="extra" className="space-y-8 mt-6">
          <Card>
            <CardContent className="pt-6">
              <ExtraSlotForm onSubmit={handleAddExtraSlot} />
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-medium mb-4">Horarios extra activos</h2>
            {sortedExtraSlots.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay horarios extra configurados</p>
            ) : (
              <div className="space-y-3">
                {sortedExtraSlots.map((slot) => {
                  const date = parseISO(slot.fecha);
                  const timeLabel = TIME_SLOTS.find((t) => t.value === slot.horario)?.label;

                  return (
                    <Card key={slot.id} className="animate-fade-in">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <CalendarPlus className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium capitalize">
                                {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{timeLabel}</Badge>
                                {slot.motivo && (
                                  <span className="text-xs text-muted-foreground">{slot.motivo}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveExtraSlot(slot.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
