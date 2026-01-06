import { useEffect, useRef } from "react";
import { Bell, BellRing, Clock, Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reservation, TIME_SLOTS } from "@/types/reservation";
import { useReminders } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";

interface ReminderPanelProps {
  reservations: Reservation[];
  onMarkReminderShown: (id: string, type: "24h" | "2h") => void;
}

export function ReminderPanel({ reservations, onMarkReminderShown }: ReminderPanelProps) {
  const {
    upcomingReminders,
    browserNotificationsEnabled,
    requestNotificationPermission,
    sendBrowserNotification,
  } = useReminders(reservations);

  const notifiedRef = useRef<Set<string>>(new Set());

  // Send browser notifications for new reminders
  useEffect(() => {
    upcomingReminders.forEach((reminder) => {
      const key = `${reminder.reservation.id}-${reminder.type}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        const timeSlot = TIME_SLOTS.find((t) => t.value === reminder.reservation.horario);
        const timeLabel = timeSlot?.label || reminder.reservation.horario;
        
        sendBrowserNotification(
          `⏰ Recordatorio de reservación`,
          `${reminder.reservation.nombre_cliente} - ${reminder.reservation.fecha} a las ${timeLabel} (${reminder.reservation.numero_personas} personas)`
        );
      }
    });
  }, [upcomingReminders, sendBrowserNotification]);

  const formatTimeUntil = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (upcomingReminders.length === 0) {
    return null;
  }

  return (
    <Card className="border-gold/30 bg-gradient-to-r from-gold/5 via-champagne/30 to-gold/5 shadow-soft overflow-hidden animate-fade-in relative">
      {/* Decorative accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 gradient-gold" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gold/10">
              <BellRing className="w-4 h-4 text-gold animate-pulse-soft" />
            </div>
            Próximas reservaciones
          </CardTitle>
          {!browserNotificationsEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={requestNotificationPermission}
              className="text-xs text-muted-foreground hover:text-gold hover:bg-gold/10 gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              Activar notificaciones
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {upcomingReminders.map((reminder, index) => {
          const timeSlot = TIME_SLOTS.find((t) => t.value === reminder.reservation.horario);
          const timeLabel = timeSlot?.label || reminder.reservation.horario;

          return (
            <div
              key={`${reminder.reservation.id}-${reminder.type}`}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl transition-all duration-300 animate-fade-in",
                reminder.type === "2h" 
                  ? "bg-destructive/10 border border-destructive/30" 
                  : "bg-warning/10 border border-warning/30"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {reminder.reservation.nombre_cliente}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                  <span>{reminder.reservation.fecha}</span>
                  <span className="text-border">•</span>
                  <span>{timeLabel}</span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {reminder.reservation.numero_personas}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <Badge
                  variant={reminder.type === "2h" ? "destructive" : "secondary"}
                  className={cn(
                    "gap-1.5 shrink-0 font-medium px-2.5",
                    reminder.type === "2h" 
                      ? "bg-destructive/20 text-destructive border border-destructive/30" 
                      : "bg-warning/20 text-warning border border-warning/30"
                  )}
                >
                  <Clock className={cn("w-3 h-3", reminder.type === "2h" && "animate-pulse-soft")} />
                  {formatTimeUntil(reminder.minutesUntil)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 px-3 hover:bg-success/10 hover:text-success transition-colors"
                  onClick={() => onMarkReminderShown(reminder.reservation.id, reminder.type)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Listo
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
