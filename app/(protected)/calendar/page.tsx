'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { DayPicker } from 'react-day-picker';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

enum ViewType {
  Month = 'month',
  Week = 'week',
  Day = 'day'
}

export default function CalendarPage() {
  const { sessions } = useAppStore();
  const [view, setView] = useState<ViewType>(ViewType.Month);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const sessionsForDate = sessions.filter(s => isSameDay(new Date(s.start), selectedDate));

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Calendário</h1>
        <Select value={view} onValueChange={v => setView(v as any)}>
          <SelectTrigger className="w-32 bg-gray-900/50 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="month">Mês</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="day">Dia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {view === ViewType.Month && (
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={(day) => {
              if (day !== undefined) {
                setSelectedDate(day);
              }
            }}
            modifiers={{
              hasSessions: sessions.map(s => new Date(s.start)),
            }}
            modifiersClassNames={{
              hasSessions: 'bg-blue-600 text-white rounded-full',
            }}
          />
        </Card>
      )}

      {view === ViewType.Week && (
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="grid grid-cols-7 gap-2 text-center text-white">
            {weekDays.map(day => {
              const daySessions = sessions.filter(s => isSameDay(new Date(s.start), day));
              const total = daySessions.reduce((sum, s) => sum + s.durationSec, 0) / 3600;
              return (
                <div key={day.toISOString()}>
                  <div className="font-medium">{format(day, 'dd/MM')}</div>
                  <div className="text-sm text-gray-400">{total.toFixed(1)}h</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === ViewType.Day && (
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <h2 className="text-white mb-4">{format(selectedDate, 'PPPP', { locale: ptBR })}</h2>
          {sessionsForDate.length > 0 ? (
            <ul className="space-y-2">
              {sessionsForDate.map(s => (
                <li key={s.id} className="text-gray-300">
                  {format(new Date(s.start), 'HH:mm')} - {s.end ? format(new Date(s.end), 'HH:mm') : '-'} ({(s.durationSec / 3600).toFixed(2)}h)
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">Sem sessões</div>
          )}
        </Card>
      )}
    </div>
  );
}
