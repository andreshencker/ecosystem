'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';

import { formatContractLabel } from '@/lib/formatContract';
import { formatShiftTime, formatShiftTimeRange } from '@/lib/formatShift';
import type { Shift } from '@/types/shift';

// ─── Public types ─────────────────────────────────────────────────────────────

type CalView = 'month' | 'week' | 'day';

export interface ShiftCalendarViewProps {
  shifts:       Shift[];
  isLoading:    boolean;
  onShiftClick: (shift: Shift) => void;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;   // px per hour in the time grid
const TIME_COL_W  = 52;   // px for the fixed time-label column

// ─── Static data ──────────────────────────────────────────────────────────────

const DAY_ABBR  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS_24  = Array.from({ length: 24 }, (_, i) => i);

// Status → visual tokens (shared across all views)
const S_BORDER: Record<string, string> = {
  draft:     'grey.400',
  confirmed: 'success.main',
  cancelled: 'error.main',
};
const S_BG: Record<string, string> = {
  draft:     'grey.100',
  confirmed: 'success.50',
  cancelled: 'error.50',
};
const S_BG_HOVER: Record<string, string> = {
  draft:     'grey.200',
  confirmed: 'success.100',
  cancelled: 'error.100',
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** YYYY-MM-DD from a local Date (no UTC conversion). */
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Minutes from midnight for "HH:mm". */
function toMin(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "1 AM", "12 PM", etc. */
function hourLabel(h: number): string {
  if (h === 0)  return '12 AM';
  if (h < 12)   return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

/** Monday of the ISO week containing `date`. */
function weekStart(date: Date): Date {
  const d   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7; // 0=Mon
  d.setDate(d.getDate() - dow);
  return d;
}

/** Seven consecutive dates starting from `start`. */
function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * All calendar cells (including padding nulls) for month view.
 * Weeks start on Monday.
 */
function buildMonthCells(year: number, month: number): (Date | null)[] {
  const firstDay    = new Date(year, month, 1);
  const lastDay     = new Date(year, month + 1, 0);
  const leadingPad  = (firstDay.getDay() + 6) % 7;

  const cells: (Date | null)[] = Array(leadingPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Compute the navigation title for the given view + anchor date. */
function navTitle(view: CalView, anchor: Date): string {
  if (view === 'month') {
    return anchor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const start = weekStart(anchor);
    const end   = new Date(start);
    end.setDate(start.getDate() + 6);
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-AU', { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    }
    return (
      start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) +
      ' – ' +
      end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) +
      ', ' + end.getFullYear()
    );
  }
  // day
  return anchor.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Advance the anchor date by `dir` steps appropriate for the view. */
function stepAnchor(view: CalView, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor);
  if (view === 'month') d.setMonth(d.getMonth() + dir);
  if (view === 'week')  d.setDate(d.getDate() + dir * 7);
  if (view === 'day')   d.setDate(d.getDate() + dir);
  return d;
}

/** Short human label for a Shift event. */
function eventLabel(shift: Shift): string {
  if (shift.contract) return formatContractLabel(shift.contract);
  if (shift.createdFromCalendar && !shift.contractAssigned) return 'Pending contract';
  return shift.title ?? formatShiftTimeRange(shift.startTime, shift.endTime);
}

// ─── Time-grid event layout ───────────────────────────────────────────────────

interface RawTimeEvent {
  shift:     Shift;
  startMin:  number; // minutes from midnight on dayStr
  endMin:    number; // capped at 24*60 for overnight
  clipped:   'start' | 'end' | null; // visual indicator for overnight continuation
}

interface LayoutEvent extends RawTimeEvent {
  col:     number;
  numCols: number;
}

/**
 * Collect the time-grid events that fall on `dayStr`.
 * - allDay shifts → excluded (rendered in the all-day row)
 * - shift.date === dayStr → show from startTime
 * - shift ends on dayStr (overnight continuation) → show from 00:00
 */
function timeEventsForDay(shifts: Shift[], dayStr: string): RawTimeEvent[] {
  const result: RawTimeEvent[] = [];

  for (const shift of shifts) {
    if (shift.allDay) continue;
    const endDate = shift.endDate ?? shift.date;

    const startsHere = shift.date === dayStr;
    const endsHere   = endDate === dayStr && shift.date < dayStr;

    if (!startsHere && !endsHere) continue;

    if (startsHere) {
      const startMin  = toMin(shift.startTime);
      const overnight = endDate > dayStr;
      const rawEnd    = overnight ? 24 * 60 : toMin(shift.endTime);
      result.push({
        shift,
        startMin,
        endMin:  Math.max(rawEnd, startMin + 15),
        clipped: overnight ? 'end' : null,
      });
    } else {
      // overnight continuation ending on this day
      const endMin = toMin(shift.endTime);
      result.push({
        shift,
        startMin: 0,
        endMin:   Math.max(endMin, 15),
        clipped:  'start',
      });
    }
  }
  return result;
}

/** Assign column indices so overlapping events don't occupy the same column. */
function layoutEvents(raw: RawTimeEvent[]): LayoutEvent[] {
  if (!raw.length) return [];
  const sorted  = [...raw].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const colEnds: number[] = [];
  const placed: LayoutEvent[] = [];

  for (const ev of sorted) {
    let col = colEnds.findIndex((end) => end <= ev.startMin);
    if (col === -1) { col = colEnds.length; colEnds.push(ev.endMin); }
    else colEnds[col] = ev.endMin;
    placed.push({ ...ev, col, numCols: 0 });
  }
  const total = colEnds.length;
  return placed.map((e) => ({ ...e, numCols: total }));
}

// ─── Shared event chip (Month view + all-day row) ─────────────────────────────

function EventChip({ shift, onClick }: { shift: Shift; onClick: () => void }) {
  const label   = eventLabel(shift);
  const tooltip = [formatShiftTimeRange(shift.startTime, shift.endTime), label, shift.location]
    .filter(Boolean).join(' · ');

  return (
    <Tooltip title={tooltip} placement="top">
      <Box
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
        sx={{
          px: 0.5, py: '2px', borderRadius: 0.5, cursor: 'pointer',
          bgcolor:  S_BG[shift.status]    ?? 'grey.100',
          borderLeft: '2px solid',
          borderColor: S_BORDER[shift.status] ?? 'grey.400',
          overflow: 'hidden',
          '&:hover':        { bgcolor: S_BG_HOVER[shift.status] ?? 'grey.200' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      >
        <Typography component="span" sx={{ fontSize: '0.625rem', lineHeight: 1.3, fontWeight: 500, display: 'block' }} noWrap>
          {formatShiftTime(shift.startTime)} {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ─── Time-grid event block (Week / Day) ───────────────────────────────────────

function TimeEventBlock({ ev, onShiftClick }: { ev: LayoutEvent; onShiftClick: (s: Shift) => void }) {
  const { shift, startMin, endMin, clipped, col, numCols } = ev;
  const top    = (startMin / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 16);
  const label  = eventLabel(shift);
  const short  = height < 26;

  return (
    <Tooltip
      title={`${formatShiftTimeRange(shift.startTime, shift.endTime)} · ${label}${shift.location ? ' · ' + shift.location : ''}`}
      placement="right"
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={() => onShiftClick(shift)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onShiftClick(shift); }}
        sx={{
          position: 'absolute',
          top,
          height,
          left:   `${(col / numCols) * 100}%`,
          width:  `calc(${(1 / numCols) * 100}% - 2px)`,
          cursor: 'pointer',
          zIndex: 1,
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', zIndex: 2 },
        }}
      >
        <Box sx={{
          height: '100%',
          overflow: 'hidden',
          bgcolor: S_BG[shift.status] ?? 'grey.100',
          borderLeft: '3px solid',
          borderColor: S_BORDER[shift.status] ?? 'grey.400',
          borderRadius: '0 3px 3px 0',
          px: 0.5,
          '&:hover': { bgcolor: S_BG_HOVER[shift.status] ?? 'grey.200' },
        }}>
          {!short && (
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {formatShiftTime(shift.startTime)}
              {clipped === 'start' && ' ↩'}
              {clipped === 'end'   && ' ↪'}
            </Typography>
          )}
          <Typography sx={{ fontSize: '0.625rem', lineHeight: 1.3 }} noWrap>
            {label}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

// ─── Current time indicator ───────────────────────────────────────────────────

function NowLine() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;

  return (
    <Box sx={{ position: 'absolute', top, left: 0, right: 0, zIndex: 3, pointerEvents: 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', ml: '-4px', flexShrink: 0 }} />
        <Box sx={{ flex: 1, height: '2px', bgcolor: 'error.main' }} />
      </Box>
    </Box>
  );
}

// ─── Time column (single day in time grid) ────────────────────────────────────

function TimeColumn({
  dayStr, dayShifts, isToday, onShiftClick,
}: {
  dayStr:       string;
  dayShifts:    Shift[];
  isToday:      boolean;
  onShiftClick: (s: Shift) => void;
}) {
  const raw    = useMemo(() => timeEventsForDay(dayShifts, dayStr), [dayShifts, dayStr]);
  const events = useMemo(() => layoutEvents(raw), [raw]);

  return (
    <Box sx={{ height: '100%', position: 'relative', bgcolor: isToday ? 'primary.50' : 'background.paper' }}>
      {/* Horizontal hour lines */}
      {HOURS_24.map((h) => (
        <Box
          key={h}
          sx={{
            position: 'absolute', top: h * HOUR_HEIGHT, left: 0, right: 0,
            borderTop: h === 0 ? 'none' : '1px solid', borderColor: 'divider',
          }}
        />
      ))}
      {/* Events */}
      {events.map((ev) => (
        <TimeEventBlock
          key={`${ev.shift.id}-${ev.clipped ?? 'n'}`}
          ev={ev}
          onShiftClick={onShiftClick}
        />
      ))}
      {/* Current time indicator (today only) */}
      {isToday && <NowLine />}
    </Box>
  );
}

// ─── Time label column ────────────────────────────────────────────────────────

function TimeLabelColumn() {
  return (
    <Box sx={{ width: TIME_COL_W, flexShrink: 0, position: 'relative', borderRight: '1px solid', borderColor: 'divider' }}>
      {HOURS_24.map((h) => (
        <Box
          key={h}
          sx={{ position: 'absolute', top: h * HOUR_HEIGHT, right: 4, transform: 'translateY(-50%)' }}
        >
          {h > 0 && (
            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
              {hourLabel(h)}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  shifts, anchor, todayStr, isLoading, onShiftClick,
}: {
  shifts:       Shift[];
  anchor:       Date;
  todayStr:     string;
  isLoading:    boolean;
  onShiftClick: (s: Shift) => void;
}) {
  const year  = anchor.getFullYear();
  const month = anchor.getMonth();

  // Only shifts whose start date falls in this month
  const monthShifts = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return shifts.filter((s) => s.date.startsWith(prefix));
  }, [shifts, year, month]);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of monthShifts) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [monthShifts]);

  const totalRows = cells.length / 7;

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {/* Day-of-week header */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        {DAY_ABBR.map((d, i) => (
          <Box key={d} sx={{ py: 0.75, textAlign: 'center', borderRight: i < 6 ? '1px solid' : 'none', borderColor: 'divider' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">{d}</Typography>
          </Box>
        ))}
      </Box>

      {/* Loading skeleton */}
      {isLoading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              sx={{ minHeight: { xs: 64, sm: 90 }, borderRight: (i % 7) < 6 ? '1px solid' : 'none', borderBottom: i < 28 ? '1px solid' : 'none', borderColor: 'divider' }}
            />
          ))}
        </Box>
      )}

      {/* Calendar cells */}
      {!isLoading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            const col      = idx % 7;
            const row      = Math.floor(idx / 7);
            const lastCol  = col === 6;
            const lastRow  = row === totalRows - 1;

            if (!day) {
              return (
                <Box key={`blank-${idx}`} sx={{ minHeight: { xs: 64, sm: 90 }, bgcolor: 'grey.50', borderRight: lastCol ? 'none' : '1px solid', borderBottom: lastRow ? 'none' : '1px solid', borderColor: 'divider' }} />
              );
            }

            const dateStr  = toLocalISO(day);
            const dayList  = byDate.get(dateStr) ?? [];
            const isToday  = dateStr === todayStr;

            return (
              <Box
                key={dateStr}
                sx={{ minHeight: { xs: 64, sm: 90 }, p: 0.5, bgcolor: isToday ? 'primary.50' : 'background.paper', borderRight: lastCol ? 'none' : '1px solid', borderBottom: lastRow ? 'none' : '1px solid', borderColor: 'divider', overflow: 'hidden' }}
              >
                <Typography
                  variant="caption"
                  display="block"
                  fontWeight={isToday ? 700 : 400}
                  color={isToday ? 'primary.main' : 'text.secondary'}
                  mb={0.25}
                >
                  {day.getDate()}
                </Typography>
                <Box display="flex" flexDirection="column" gap="2px">
                  {dayList.slice(0, 3).map((s) => (
                    <EventChip key={s.id} shift={s} onClick={() => onShiftClick(s)} />
                  ))}
                  {dayList.length > 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', pl: 0.25 }}>
                      +{dayList.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && monthShifts.length === 0 && (
        <Box py={4} textAlign="center">
          <Typography variant="body2" color="text.secondary">No shifts in this period.</Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  shifts, anchor, todayStr, isLoading, onShiftClick,
}: {
  shifts:       Shift[];
  anchor:       Date;
  todayStr:     string;
  isLoading:    boolean;
  onShiftClick: (s: Shift) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const start     = weekStart(anchor);
  const days      = weekDays(start);

  // Scroll to current hour (−1h for context) when the week changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    scrollRef.current.scrollTop = Math.max(0, (now.getHours() - 1)) * HOUR_HEIGHT;
  }, [start.toISOString()]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-compute: allDay map + timed shifts per day
  const { allDayMap, timedMap } = useMemo(() => {
    const allDayMap = new Map<string, Shift[]>();
    const timedMap  = new Map<string, Shift[]>();
    for (const day of days) {
      const ds = toLocalISO(day);
      allDayMap.set(ds, []);
      timedMap.set(ds, []);
    }
    for (const s of shifts) {
      const endDate = s.endDate ?? s.date;
      for (const day of days) {
        const ds = toLocalISO(day);
        const onDay = s.date === ds || (endDate === ds && s.date < ds);
        if (!onDay) continue;
        if (s.allDay) allDayMap.get(ds)?.push(s);
        else          timedMap.get(ds)?.push(s);
      }
    }
    return { allDayMap, timedMap };
  }, [shifts, start.getTime()]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {/* ── Day header ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Box sx={{ width: TIME_COL_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }} />
        {days.map((day) => {
          const ds      = toLocalISO(day);
          const isToday = ds === todayStr;
          return (
            <Box key={ds} sx={{ flex: 1, minWidth: 80, py: 0.75, textAlign: 'center', borderRight: '1px solid', borderColor: 'divider', bgcolor: isToday ? 'primary.50' : undefined }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                {day.toLocaleDateString('en-AU', { weekday: 'short' })}
              </Typography>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', bgcolor: isToday ? 'primary.main' : 'transparent' }}>
                <Typography variant="body2" fontWeight={isToday ? 700 : 400} color={isToday ? 'primary.contrastText' : 'text.primary'}>
                  {day.getDate()}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ── All-day row ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
        <Box sx={{ width: TIME_COL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 0.75, borderRight: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.55rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>all day</Typography>
        </Box>
        {days.map((day) => {
          const ds = toLocalISO(day);
          return (
            <Box key={ds} sx={{ flex: 1, minWidth: 80, borderRight: '1px solid', borderColor: 'divider', p: 0.25, display: 'flex', flexDirection: 'column', gap: '2px', minHeight: 20 }}>
              {(allDayMap.get(ds) ?? []).map((s) => (
                <EventChip key={s.id} shift={s} onClick={() => onShiftClick(s)} />
              ))}
            </Box>
          );
        })}
      </Box>

      {/* ── Scrollable time grid ─────────────────────────────────────────── */}
      <Box
        ref={scrollRef}
        sx={{ overflowY: 'auto', overflowX: 'auto', maxHeight: 'max(380px, calc(100vh - 460px))' }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', height: 6 * HOUR_HEIGHT }}>
            <Box sx={{ width: TIME_COL_W, flexShrink: 0 }} />
            {days.map((day) => (
              <Skeleton key={toLocalISO(day)} variant="rectangular" sx={{ flex: 1, minWidth: 80, borderRight: '1px solid', borderColor: 'divider' }} />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', height: 24 * HOUR_HEIGHT, minWidth: TIME_COL_W + 7 * 80 }}>
            <TimeLabelColumn />
            {days.map((day) => {
              const ds      = toLocalISO(day);
              const isToday = ds === todayStr;
              return (
                <Box key={ds} sx={{ flex: 1, minWidth: 80, position: 'relative', borderRight: '1px solid', borderColor: 'divider' }}>
                  <TimeColumn
                    dayStr={ds}
                    dayShifts={timedMap.get(ds) ?? []}
                    isToday={isToday}
                    onShiftClick={onShiftClick}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  shifts, anchor, todayStr, isLoading, onShiftClick,
}: {
  shifts:       Shift[];
  anchor:       Date;
  todayStr:     string;
  isLoading:    boolean;
  onShiftClick: (s: Shift) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateStr   = toLocalISO(anchor);
  const isToday   = dateStr === todayStr;

  // Scroll to current hour on date change
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    scrollRef.current.scrollTop = Math.max(0, (now.getHours() - 1)) * HOUR_HEIGHT;
  }, [dateStr]);

  const { allDayShifts, timedShifts } = useMemo(() => {
    const endMatch = (s: Shift) => (s.endDate ?? s.date) === dateStr && s.date < dateStr;
    const relevant = shifts.filter((s) => s.date === dateStr || endMatch(s));
    return {
      allDayShifts: relevant.filter((s) => s.allDay),
      timedShifts:  relevant.filter((s) => !s.allDay),
    };
  }, [shifts, dateStr]);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {/* Day header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: isToday ? 'primary.50' : 'grey.50' }}>
        <Typography variant="subtitle2" fontWeight={700} color={isToday ? 'primary.main' : 'text.primary'}>
          {anchor.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Typography>
        {isToday && <Chip label="Today" size="small" color="primary" variant="outlined" sx={{ height: 20 }} />}
      </Box>

      {/* All-day section */}
      {allDayShifts.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.55rem', color: 'text.disabled', mr: 0.5 }}>all day</Typography>
          {allDayShifts.map((s) => (
            <EventChip key={s.id} shift={s} onClick={() => onShiftClick(s)} />
          ))}
        </Box>
      )}

      {/* Scrollable time grid */}
      <Box
        ref={scrollRef}
        sx={{ overflowY: 'auto', maxHeight: 'max(380px, calc(100vh - 420px))' }}
      >
        {isLoading ? (
          <Skeleton variant="rectangular" height={6 * HOUR_HEIGHT} />
        ) : (
          <Box sx={{ display: 'flex', height: 24 * HOUR_HEIGHT }}>
            <TimeLabelColumn />
            <Box sx={{ flex: 1, position: 'relative' }}>
              <TimeColumn
                dayStr={dateStr}
                dayShifts={timedShifts}
                isToday={isToday}
                onShiftClick={onShiftClick}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Empty state */}
      {!isLoading && allDayShifts.length === 0 && timedShifts.length === 0 && (
        <Box py={3} textAlign="center">
          <Typography variant="body2" color="text.secondary">No shifts on this day.</Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── ShiftCalendarView ────────────────────────────────────────────────────────

export function ShiftCalendarView({ shifts, isLoading, onShiftClick }: ShiftCalendarViewProps) {
  const [calView, setCalView] = useState<CalView>('month');
  const [anchor,  setAnchor]  = useState<Date>(() => new Date());
  const todayStr = toLocalISO(new Date());

  function prev()    { setAnchor((d) => stepAnchor(calView, d, -1)); }
  function next()    { setAnchor((d) => stepAnchor(calView, d, +1)); }
  function goToday() { setAnchor(new Date()); }

  const title = navTitle(calView, anchor);

  return (
    <Box>
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={1.5}
      >
        {/* View selector */}
        <ToggleButtonGroup
          value={calView}
          exclusive
          onChange={(_, v: CalView | null) => { if (v) setCalView(v); }}
          size="small"
          aria-label="Calendar view"
        >
          <ToggleButton value="month" aria-label="Month view">Month</ToggleButton>
          <ToggleButton value="week"  aria-label="Week view">Week</ToggleButton>
          <ToggleButton value="day"   aria-label="Day view">Day</ToggleButton>
        </ToggleButtonGroup>

        {/* Navigation */}
        <Box display="flex" alignItems="center" gap={0.5} sx={{ flexGrow: 1 }}>
          <IconButton size="small" onClick={prev} aria-label="Previous">
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ flex: 1, textAlign: 'center', userSelect: 'none', minWidth: 180 }}
          >
            {title}
          </Typography>
          <IconButton size="small" onClick={next} aria-label="Next">
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Today button + loading */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <IconButton size="small" onClick={goToday} aria-label="Go to today">
            <TodayIcon fontSize="small" />
          </IconButton>
          {isLoading && <CircularProgress size={14} color="inherit" sx={{ opacity: 0.5 }} />}
        </Box>
      </Stack>

      {/* ── Views ─────────────────────────────────────────────────────────── */}
      {calView === 'month' && (
        <MonthView
          shifts={shifts}
          anchor={anchor}
          todayStr={todayStr}
          isLoading={isLoading}
          onShiftClick={onShiftClick}
        />
      )}
      {calView === 'week' && (
        <WeekView
          shifts={shifts}
          anchor={anchor}
          todayStr={todayStr}
          isLoading={isLoading}
          onShiftClick={onShiftClick}
        />
      )}
      {calView === 'day' && (
        <DayView
          shifts={shifts}
          anchor={anchor}
          todayStr={todayStr}
          isLoading={isLoading}
          onShiftClick={onShiftClick}
        />
      )}
    </Box>
  );
}
