import { useState, useEffect, useCallback, useMemo } from "react";
import { Reservation, TIME_SLOTS } from "@/types/reservation";

interface ReminderInfo {
  reservation: Reservation;
  type: "24h" | "2h";
  minutesUntil: number;
}

export function useReminders(reservations: Reservation[]) {
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);

  // Check and request browser notification permission
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setBrowserNotificationsEnabled(true);
      }
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotificationsEnabled(permission === "granted");
      return permission === "granted";
    }
    return false;
  }, []);

  // Calculate upcoming reminders
  const upcomingReminders = useMemo(() => {
    const now = new Date();
    const reminders: ReminderInfo[] = [];

    reservations
      .filter((r) => r.estado !== "Cancelada" && r.estado !== "Completada")
      .forEach((reservation) => {
        const timeSlot = TIME_SLOTS.find((t) => t.value === reservation.horario);
        if (!timeSlot) return;

        const reservationDate = new Date(reservation.fecha + "T00:00:00");
        reservationDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

        const diffMs = reservationDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = diffMinutes / 60;

        // 24h reminder: between 23-25 hours before
        if (diffHours > 0 && diffHours <= 25 && !reservation.reminder_24h_shown) {
          reminders.push({
            reservation,
            type: "24h",
            minutesUntil: diffMinutes,
          });
        }

        // 2h reminder: between 1-3 hours before
        if (diffHours > 0 && diffHours <= 3 && !reservation.reminder_2h_shown) {
          reminders.push({
            reservation,
            type: "2h",
            minutesUntil: diffMinutes,
          });
        }
      });

    return reminders.sort((a, b) => a.minutesUntil - b.minutesUntil);
  }, [reservations]);

  // Check if a reservation is within 24h
  const isWithin24Hours = useCallback((reservation: Reservation) => {
    const now = new Date();
    const timeSlot = TIME_SLOTS.find((t) => t.value === reservation.horario);
    if (!timeSlot) return false;

    const reservationDate = new Date(reservation.fecha + "T00:00:00");
    reservationDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

    const diffMs = reservationDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 0 && diffHours <= 24;
  }, []);

  // Check if a reservation is within 2h
  const isWithin2Hours = useCallback((reservation: Reservation) => {
    const now = new Date();
    const timeSlot = TIME_SLOTS.find((t) => t.value === reservation.horario);
    if (!timeSlot) return false;

    const reservationDate = new Date(reservation.fecha + "T00:00:00");
    reservationDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

    const diffMs = reservationDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 0 && diffHours <= 2;
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (browserNotificationsEnabled && "Notification" in window) {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "reservation-reminder",
      });
    }
  }, [browserNotificationsEnabled]);

  return {
    upcomingReminders,
    browserNotificationsEnabled,
    requestNotificationPermission,
    isWithin24Hours,
    isWithin2Hours,
    sendBrowserNotification,
  };
}
