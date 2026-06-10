'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { calendarApi, CalendarEvent } from '@/lib/api';
import ui from '@/components/ui/ui.module.css';
import styles from './calendar.module.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: CalendarEvent;
}

export default function CalendarPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const range = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [currentDate]);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await calendarApi.events(token, range.start, range.end);
    setEvents(
      res.events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        allDay: e.allDay,
        resource: e,
      })),
    );
  }, [token, range.start, range.end]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell title="Calendar" description="Project deadlines and task due dates">
      <div className={styles.layout}>
        <div className={`${ui.card} ${styles.calendarCard}`}>
          <Calendar
            localizer={localizer}
            events={events}
            view={Views.MONTH}
            onNavigate={(date) => setCurrentDate(date)}
            onSelectEvent={(event) => setSelected((event as CalendarItem).resource)}
            eventPropGetter={(event) => {
              const type = (event as CalendarItem).resource.type;
              return {
                className: type === 'project' ? styles.eventProject : styles.eventTask,
              };
            }}
            style={{ height: 560 }}
          />
        </div>

        {selected && (
          <div className={ui.card}>
            <div className={ui.cardTitle}>{selected.title}</div>
            <div className={ui.cardDesc}>
              {selected.type === 'project' ? 'Project deadline' : 'Task due date'}
            </div>
            <p className={styles.detail}>
              Date: {new Date(selected.start).toLocaleDateString()}
            </p>
            {selected.status && (
              <p className={styles.detail}>Status: {selected.status}</p>
            )}
            <Link
              href={`/projects/${selected.projectId}`}
              className={`${ui.button} ${ui.primary} ${ui.sm}`}
              style={{ marginTop: '0.75rem', display: 'inline-flex' }}
            >
              View project
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
