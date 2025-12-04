import { useState, useCallback } from "react";
import { Reservation, TimeBlock, TimeSlot, MAX_CAPACITY } from "@/types/reservation";
import { mockReservations, mockBlocks } from "@/lib/mockData";

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [blocks, setBlocks] = useState<TimeBlock[]>(mockBlocks);

  const getReservationsForSlot = useCallback(
    (fecha: string, horario: TimeSlot) => {
      return reservations.filter(
        (r) => r.fecha === fecha && r.horario === horario && r.estado !== "Cancelada"
      );
    },
    [reservations]
  );

  const getCapacityForSlot = useCallback(
    (fecha: string, horario: TimeSlot) => {
      const slotReservations = getReservationsForSlot(fecha, horario);
      return slotReservations.reduce((sum, r) => sum + r.numero_personas, 0);
    },
    [getReservationsForSlot]
  );

  const isSlotBlocked = useCallback(
    (fecha: string, horario: TimeSlot) => {
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
    (fecha: string, horario: TimeSlot, personas: number, excludeId?: string) => {
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

  const addReservation = useCallback((reservation: Omit<Reservation, "id" | "created_at" | "updated_at">) => {
    const newReservation: Reservation = {
      ...reservation,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setReservations((prev) => [...prev, newReservation]);
    return newReservation;
  }, []);

  const updateReservation = useCallback((id: string, updates: Partial<Reservation>) => {
    setReservations((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
      )
    );
  }, []);

  const cancelReservation = useCallback((id: string) => {
    updateReservation(id, { estado: "Cancelada" });
  }, [updateReservation]);

  const addBlock = useCallback((block: Omit<TimeBlock, "id">) => {
    const newBlock: TimeBlock = {
      ...block,
      id: Date.now().toString(),
    };
    setBlocks((prev) => [...prev, newBlock]);
    return newBlock;
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const getBlocksForDate = useCallback(
    (fecha: string) => {
      return blocks.filter((b) => b.fecha === fecha);
    },
    [blocks]
  );

  return {
    reservations,
    blocks,
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
    getBlocksForDate,
  };
}
