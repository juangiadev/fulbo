import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './DateTimePicker.module.css';

interface DateTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const QUICK_TIMES = ['18:00', '19:30', '21:00', '22:30'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalDateTimeValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDateTime(value: string): Date | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function DateTimePicker({ label, value, onChange }: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = useMemo(() => parseLocalDateTime(value), [value]);

  const [visibleMonthDate, setVisibleMonthDate] = useState<Date>(() => {
    const base = selectedDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    const base = selectedDate ?? new Date();
    setVisibleMonthDate(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  const monthLabel = useMemo(
    () =>
      visibleMonthDate.toLocaleDateString('es-AR', {
        month: 'long',
        year: 'numeric',
      }),
    [visibleMonthDate],
  );

  const monthCells = useMemo(() => {
    const year = visibleMonthDate.getFullYear();
    const month = visibleMonthDate.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<number | null> = [];
    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [visibleMonthDate]);

  const selectedHour = selectedDate ? pad(selectedDate.getHours()) : '20';
  const selectedMinute = selectedDate ? pad(selectedDate.getMinutes()) : '00';

  const displayValue = selectedDate
    ? selectedDate.toLocaleString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Seleccionar fecha y hora';

  const setDatePart = (day: number) => {
    const base = selectedDate ?? new Date();
    const next = new Date(
      visibleMonthDate.getFullYear(),
      visibleMonthDate.getMonth(),
      day,
      base.getHours(),
      base.getMinutes(),
      0,
      0,
    );
    onChange(toLocalDateTimeValue(next));
  };

  const setTimePart = (hour: string, minute: string) => {
    const base = selectedDate ?? new Date();
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Number(hour),
      Number(minute),
      0,
      0,
    );
    onChange(toLocalDateTimeValue(next));
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <span className={styles.label}>{label}</span>
      <button
        aria-expanded={isOpen}
        className={styles.trigger}
        onClick={() => setIsOpen((previous) => !previous)}
        ref={triggerRef}
        type="button"
      >
        {displayValue}
      </button>

      {isOpen ? (
        <div aria-label="Selector de fecha y hora" className={styles.popover} role="dialog">
          <div className={styles.calendarHeader}>
            <button
              aria-label="Mes anterior"
              className={styles.monthButton}
              onClick={() =>
                setVisibleMonthDate(
                  (previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1),
                )
              }
              type="button"
            >
              {'<'}
            </button>
            <p className={styles.monthLabel}>{monthLabel}</p>
            <button
              aria-label="Mes siguiente"
              className={styles.monthButton}
              onClick={() =>
                setVisibleMonthDate(
                  (previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1),
                )
              }
              type="button"
            >
              {'>'}
            </button>
          </div>

          <div className={styles.weekHeader}>
            {WEEK_DAYS.map((day) => (
              <span className={styles.weekLabel} key={day}>
                {day}
              </span>
            ))}
          </div>

          <div className={styles.daysGrid}>
            {monthCells.map((day, index) => {
              if (!day) {
                return <span className={styles.dayEmpty} key={`empty-${index}`} />;
              }

              const isSelected =
                selectedDate?.getFullYear() === visibleMonthDate.getFullYear() &&
                selectedDate?.getMonth() === visibleMonthDate.getMonth() &&
                selectedDate?.getDate() === day;

              return (
                <button
                  className={`${styles.dayButton} ${isSelected ? styles.dayButtonSelected : ''}`}
                  key={day}
                  onClick={() => setDatePart(day)}
                  type="button"
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className={styles.timeRow}>
            <label className={styles.timeField}>
              Hora
              <select
                onChange={(event) => setTimePart(event.target.value, selectedMinute)}
                value={selectedHour}
              >
                {Array.from({ length: 24 }).map((_, hour) => {
                  const option = pad(hour);
                  return (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className={styles.timeField}>
              Min
              <select
                onChange={(event) => setTimePart(selectedHour, event.target.value)}
                value={selectedMinute}
              >
                {Array.from({ length: 60 }).map((_, minuteValue) => {
                  const minute = pad(minuteValue);
                  return (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          <div className={styles.quickTimes}>
            {QUICK_TIMES.map((time) => {
              const [hour, minute] = time.split(':');
              return (
                <button
                  className={styles.quickButton}
                  key={time}
                  onClick={() => setTimePart(hour, minute)}
                  type="button"
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
