import { useState, useEffect, useCallback } from "react";
import { Reservation, TimeBlock, ExtraSlot, MAX_CAPACITY } from "@/types/reservation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [extraSlots, setExtraSlots] = useState<ExtraSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [resResult, blockResult, extraResult] = await Promise.all([
          supabase.from("reservations").select("*").order("fecha", { ascending: true }),
          supabase.from("time_blocks").select("*").order("fecha", { ascending: true }),
          supabase.from("extra_slots").select("*").order("fecha", { ascending: true }),
        ]);

        if (resResult.error) throw resResult.error;
        if (blockResult.error) throw blockResult.error;
        if (extraResult.error) throw extraResult.error;

        setReservations(resResult.data as Reservation[]);
        setBlocks(blockResult.data as TimeBlock[]);
        setExtraSlots(extraResult.data as ExtraSlot[]);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("reservations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReservations((prev) => [...prev, payload.new as Reservation]);
          } else if (payload.eventType === "UPDATE") {
            setReservations((prev) =>
              prev.map((r) => (r.id === payload.new.id ? (payload.new as Reservation) : r))
            );
          } else if (payload.eventType === "DELETE") {
            setReservations((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getReservationsForSlot = useCallback(
    (fecha: string, horario: string) => {
      return reservations.filter(
        (r) => r.fecha === fecha && r.horario === horario && r.estado !== "Cancelada"
      );
    },
    [reservations]
  );

  const getCapacityForSlot = useCallback(
    (fecha: string, horario: string) => {
      const slotReservations = getReservationsForSlot(fecha, horario);
      return slotReservations.reduce((sum, r) => sum + r.numero_personas, 0);
    },
    [getReservationsForSlot]
  );

  const isSlotBlocked = useCallback(
    (fecha: string, horario: string) => {
      return blocks.some(
        (b) =>
          b.fecha === fecha && (b.horario === horario || b.horario === "DIA_COMPLETO")
      );
    },
    [blocks]
  );

  const isDayBlocked = useCallback(
    (fecha: string) => {
      return blocks.some((b) => b.fecha === fecha && b.horario === "DIA_COMPLETO");
    },
    [blocks]
  );

  const canAddReservation = useCallback(
    (fecha: string, horario: string, personas: number, excludeId?: string) => {
      if (isSlotBlocked(fecha, horario)) {
        return { allowed: false, reason: "Este horario está bloqueado" };
      }

      const currentCapacity = reservations
        .filter(
          (r) =>
            r.fecha === fecha &&
            r.horario === horario &&
            r.estado !== "Cancelada" &&
            r.id !== excludeId
        )
        .reduce((sum, r) => sum + r.numero_personas, 0);

      if (currentCapacity + personas > MAX_CAPACITY) {
        return {
          allowed: false,
          reason: `Solo quedan ${MAX_CAPACITY - currentCapacity} lugares disponibles`,
        };
      }

      return { allowed: true, reason: "" };
    },
    [reservations, isSlotBlocked]
  );

  const addReservation = useCallback(async (reservation: Omit<Reservation, "id" | "created_at" | "updated_at" | "reminder_24h_shown" | "reminder_2h_shown">) => {
    const { data, error } = await supabase
      .from("reservations")
      .insert([reservation])
      .select()
      .single();

    if (error) {
      console.error("Error adding reservation:", error);
      throw error;
    }

    return data as Reservation;
  }, []);

  const updateReservation = useCallback(async (id: string, updates: Partial<Reservation>) => {
    const { error } = await supabase
      .from("reservations")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating reservation:", error);
      throw error;
    }
  }, []);

  const cancelReservation = useCallback(async (id: string) => {
    await updateReservation(id, { estado: "Cancelada" });
  }, [updateReservation]);

  const addBlock = useCallback(async (block: Omit<TimeBlock, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("time_blocks")
      .insert([block])
      .select()
      .single();

    if (error) {
      console.error("Error adding block:", error);
      throw error;
    }

    setBlocks((prev) => [...prev, data as TimeBlock]);
    return data as TimeBlock;
  }, []);

  const removeBlock = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("time_blocks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing block:", error);
      throw error;
    }

    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addExtraSlot = useCallback(async (slot: Omit<ExtraSlot, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("extra_slots")
      .insert([slot])
      .select()
      .single();

    if (error) {
      console.error("Error adding extra slot:", error);
      throw error;
    }

    setExtraSlots((prev) => [...prev, data as ExtraSlot]);
    return data as ExtraSlot;
  }, []);

  const removeExtraSlot = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("extra_slots")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing extra slot:", error);
      throw error;
    }

    setExtraSlots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getBlocksForDate = useCallback(
    (fecha: string) => {
      return blocks.filter((b) => b.fecha === fecha);
    },
    [blocks]
  );

  const markReminderShown = useCallback(async (id: string, type: "24h" | "2h") => {
    const field = type === "24h" ? "reminder_24h_shown" : "reminder_2h_shown";
    await supabase
      .from("reservations")
      .update({ [field]: true })
      .eq("id", id);
  }, []);

  const importReservations = useCallback(async (
    reservationsToImport: Omit<Reservation, "id" | "created_at" | "updated_at" | "reminder_24h_shown" | "reminder_2h_shown">[]
  ) => {
    const { data, error } = await supabase
      .from("reservations")
      .insert(reservationsToImport)
      .select();

    if (error) {
      console.error("Error importing reservations:", error);
      throw error;
    }

    return data as Reservation[];
  }, []);

  return {
    reservations,
    blocks,
    extraSlots,
    isLoading,
    getReservationsForSlot,
    getCapacityForSlot,
    isSlotBlocked,
    isDayBlocked,
    canAddReservation,
    addReservation,
    updateReservation,
    cancelReservation,
    addBlock,
    removeBlock,
    addExtraSlot,
    removeExtraSlot,
    getBlocksForDate,
    markReminderShown,
    importReservations,
  };
}
