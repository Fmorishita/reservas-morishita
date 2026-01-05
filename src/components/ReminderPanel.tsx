import { useEffect, useRef } from "react";
import { Bell, BellRing, Clock, Users } from "lucide-react";
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
    <Card className="border-warning/50 bg-warning/5 animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BellRing className="w-4 h-4 text-warning" />
            Próximas reservaciones
          </CardTitle>
          {!browserNotificationsEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={requestNotificationPermission}
              className="text-xs"
            >
              <Bell className="w-3 h-3 mr-1" />
              Activar notificaciones
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcomingReminders.map((reminder) => {
          const timeSlot = TIME_SLOTS.find((t) => t.value === reminder.reservation.horario);
          const timeLabel = timeSlot?.label || reminder.reservation.horario;

          return (
            <div
              key={`${reminder.reservation.id}-${reminder.type}`}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-colors",
                reminder.type === "2h" 
                  ? "bg-destructive/10 border border-destructive/30" 
                  : "bg-warning/10 border border-warning/30"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {reminder.reservation.nombre_cliente}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{reminder.reservation.fecha}</span>
                  <span>•</span>
                  <span>{timeLabel}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {reminder.reservation.numero_personas}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Badge
                  variant={reminder.type === "2h" ? "destructive" : "secondary"}
                  className="gap-1 shrink-0"
                >
                  <Clock className="w-3 h-3" />
                  {formatTimeUntil(reminder.minutesUntil)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => onMarkReminderShown(reminder.reservation.id, reminder.type)}
                >
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
