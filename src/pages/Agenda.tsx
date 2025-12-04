import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, addWeeks, subWeeks, startOfWeek, addDays, isSaturday, isSunday } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayAgenda } from "@/components/DayAgenda";
import { ReservationDetail } from "@/components/ReservationDetail";
import { useReservations } from "@/hooks/useReservations";
import { Reservation, ReservationStatus } from "@/types/reservation";

export default function Agenda() {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // Monday
  });
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    reservations,
    blocks,
    getCapacityForSlot,
    isSlotBlocked,
    isDayBlocked,
    updateReservation,
    cancelReservation,
  } = useReservations();

  // Get Saturday and Sunday of current week
  const weekendDates = useMemo(() => {
    const saturday = addDays(currentWeekStart, 5);
    const sunday = addDays(currentWeekStart, 6);
    return [format(saturday, "yyyy-MM-dd"), format(sunday, "yyyy-MM-dd")];
  }, [currentWeekStart]);

  const goToPreviousWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setDetailOpen(true);
  };

  const handleEdit = (reservation: Reservation) => {
    setDetailOpen(false);
    navigate(`/editar/${reservation.id}`);
  };

  const handleStatusChange = (id: string, status: ReservationStatus) => {
    updateReservation(id, { estado: status });
    setSelectedReservation((prev) => (prev ? { ...prev, estado: status } : null));
  };

  const handleCancel = (id: string) => {
    cancelReservation(id);
  };

  // Format week range for header
  const weekRangeText = useMemo(() => {
    const saturday = addDays(currentWeekStart, 5);
    const sunday = addDays(currentWeekStart, 6);
    const satDay = format(saturday, "d", { locale: es });
    const sunDay = format(sunday, "d 'de' MMMM", { locale: es });
    return `${satDay} - ${sunDay}`;
  }, [currentWeekStart]);

  return (
    <div className="space-y-6 md:pt-14">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-medium capitalize">{weekRangeText}</h1>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Weekend days */}
      <div className="grid gap-8 md:grid-cols-2">
        {weekendDates.map((fecha) => (
          <DayAgenda
            key={fecha}
            fecha={fecha}
            reservations={reservations.filter((r) => r.fecha === fecha)}
            blocks={blocks.filter((b) => b.fecha === fecha)}
            getCapacity={getCapacityForSlot}
            isSlotBlocked={isSlotBlocked}
            isDayBlocked={isDayBlocked}
            onReservationClick={handleReservationClick}
          />
        ))}
      </div>

      {/* Reservation detail sheet */}
      <ReservationDetail
        reservation={selectedReservation}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onCancel={handleCancel}
      />
    </div>
  );
}
