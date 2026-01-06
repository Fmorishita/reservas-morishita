import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayAgenda } from "@/components/DayAgenda";
import { ReservationDetail } from "@/components/ReservationDetail";
import { ReminderPanel } from "@/components/ReminderPanel";
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
    isLoading,
    getCapacityForSlot,
    isSlotBlocked,
    isDayBlocked,
    updateReservation,
    cancelReservation,
    markReminderShown,
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

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      await updateReservation(id, { estado: status });
      setSelectedReservation((prev) => (prev ? { ...prev, estado: status } : null));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelReservation(id);
    } catch (error) {
      console.error("Error canceling reservation:", error);
    }
  };

  const handleMarkReminderShown = async (id: string, type: "24h" | "2h") => {
    try {
      await markReminderShown(id, type);
    } catch (error) {
      console.error("Error marking reminder:", error);
    }
  };

  // Format week range for header
  const weekRangeText = useMemo(() => {
    const saturday = addDays(currentWeekStart, 5);
    const sunday = addDays(currentWeekStart, 6);
    const satDay = format(saturday, "d", { locale: es });
    const sunDay = format(sunday, "d 'de' MMMM", { locale: es });
    return `${satDay} - ${sunDay}`;
  }, [currentWeekStart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 md:pt-20">
        <div className="relative">
          <div className="absolute inset-0 animate-glow rounded-full" />
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:pt-16 animate-fade-in">
      {/* Reminder panel */}
      <ReminderPanel
        reservations={reservations}
        onMarkReminderShown={handleMarkReminderShown}
      />

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-card rounded-2xl p-4 shadow-soft border border-border/50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToPreviousWeek}
          className="rounded-xl hover:bg-secondary/80 hover:text-gold transition-all duration-300"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gold/10">
            <Calendar className="w-5 h-5 text-gold" />
          </div>
          <h1 className="text-lg md:text-xl font-medium capitalize tracking-tight">{weekRangeText}</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToNextWeek}
          className="rounded-xl hover:bg-secondary/80 hover:text-gold transition-all duration-300"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Weekend days */}
      <div className="grid gap-8 md:grid-cols-2">
        {weekendDates.map((fecha, index) => (
          <div 
            key={fecha} 
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <DayAgenda
              fecha={fecha}
              reservations={reservations.filter((r) => r.fecha === fecha)}
              blocks={blocks.filter((b) => b.fecha === fecha)}
              getCapacity={getCapacityForSlot}
              isSlotBlocked={isSlotBlocked}
              isDayBlocked={isDayBlocked}
              onReservationClick={handleReservationClick}
            />
          </div>
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
