import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FocusSession, Project, Task } from '@/types';
import { formatDuration } from '@/lib/utils';

export interface DailyHoursPoint {
  date: string;
  hours: number;
}

interface ExportSessionsReportParams {
  sessions: FocusSession[];
  projects: Project[];
  tasks: Task[];
  startDate: string;
  endDate: string;
  dailyData: DailyHoursPoint[];
  filename: string;
}

const PAGE_MARGIN = 12;
const LINE_HEIGHT = 6;

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Draws a native (vector) bar chart of hours per day, mirroring the Clockify
 * summary report's daily bar chart, instead of rasterizing the on-screen chart.
 */
function drawDailyHoursBarChart(doc: jsPDF, data: DailyHoursPoint[], x: number, y: number, width: number, height: number) {
  const maxHours = Math.max(1, ...data.map(d => d.hours));
  const axisLabelWidth = 10;
  const valueLabelSpace = 5;
  const chartX = x + axisLabelWidth;
  const chartWidth = width - axisLabelWidth;
  const chartTop = y + valueLabelSpace;
  const barsHeight = height - valueLabelSpace;
  const chartBottom = chartTop + barsHeight;

  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(0.1);
  const gridLines = 4;
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  for (let i = 0; i <= gridLines; i++) {
    const lineY = chartBottom - (barsHeight * i) / gridLines;
    const value = (maxHours * i) / gridLines;
    doc.line(chartX, lineY, chartX + chartWidth, lineY);
    doc.text(value.toFixed(1), x, lineY + 1, { align: 'left' });
  }

  const barCount = data.length;
  if (barCount === 0) return;
  const slot = chartWidth / barCount;
  const barWidth = Math.min(slot * 0.55, 8);

  data.forEach((point, index) => {
    const barHeight = (point.hours / maxHours) * barsHeight;
    const slotCenter = chartX + slot * index + slot / 2;
    const barX = slotCenter - barWidth / 2;
    const barY = chartBottom - barHeight;

    if (point.hours > 0) {
      doc.setFontSize(6);
      doc.setTextColor(75, 85, 99);
      doc.text(point.hours.toFixed(1), slotCenter, Math.max(barY - 1.5, chartTop - 1), { align: 'center' });
    }

    doc.setFillColor(132, 204, 22);
    doc.rect(barX, barY, barWidth, Math.max(barHeight, 0.3), 'F');

    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text(point.date, slotCenter, chartBottom + 4, { align: 'center', angle: 0 });
  });

  doc.setDrawColor(75, 85, 99);
  doc.line(chartX, chartBottom, chartX + chartWidth, chartBottom);
  doc.setTextColor(0, 0, 0);
}

type SessionGroup = {
  key: string;
  label: string;
  durationSec: number;
  children: SessionGroup[];
  sessions: FocusSession[];
};

function groupSessions(sessions: FocusSession[], tasks: Task[]): SessionGroup[] {
  const byProject = new Map<string, FocusSession[]>();
  for (const session of sessions) {
    const list = byProject.get(session.projectId) ?? [];
    list.push(session);
    byProject.set(session.projectId, list);
  }

  const projectGroups: SessionGroup[] = Array.from(byProject.entries()).map(([projectId, projectSessions]) => {
    const byTask = new Map<string, FocusSession[]>();
    for (const session of projectSessions) {
      const taskKey = session.taskId ?? '__no_task__';
      const list = byTask.get(taskKey) ?? [];
      list.push(session);
      byTask.set(taskKey, list);
    }

    const taskGroups: SessionGroup[] = Array.from(byTask.entries()).map(([taskKey, taskSessions]) => {
      const task = taskKey !== '__no_task__' ? tasks.find(t => t.id === taskKey) : undefined;

      const byDescription = new Map<string, FocusSession[]>();
      for (const session of taskSessions) {
        const descKey = session.notes?.trim() || 'Sem descrição';
        const list = byDescription.get(descKey) ?? [];
        list.push(session);
        byDescription.set(descKey, list);
      }

      const descriptionGroups: SessionGroup[] = Array.from(byDescription.entries())
        .map(([label, descSessions]) => ({
          key: `${taskKey}-${label}`,
          label,
          durationSec: descSessions.reduce((sum: number, s: FocusSession) => sum + s.durationSec, 0),
          children: [],
          sessions: descSessions,
        }))
        .sort((a, b) => b.durationSec - a.durationSec);

      return {
        key: taskKey,
        label: task?.title ?? 'Sem tarefa',
        durationSec: taskSessions.reduce((sum: number, s: FocusSession) => sum + s.durationSec, 0),
        children: descriptionGroups,
        sessions: taskSessions,
      };
    }).sort((a, b) => b.durationSec - a.durationSec);

    return {
      key: projectId,
      label: projectId,
      durationSec: projectSessions.reduce((sum: number, s: FocusSession) => sum + s.durationSec, 0),
      children: taskGroups,
      sessions: projectSessions,
    };
  });

  return projectGroups.sort((a, b) => b.durationSec - a.durationSec);
}

export async function exportSessionsReportToPdf({
  sessions,
  projects,
  tasks,
  startDate,
  endDate,
  dailyData,
  filename,
}: ExportSessionsReportParams): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSec, 0);
  const totalValue = sessions.reduce((sum, s) => {
    const project = projects.find(p => p.id === s.projectId);
    const rate = project?.hourlyRate ? Number(project.hourlyRate) : 0;
    return sum + (s.durationSec / 3600) * rate;
  }, 0);

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Sessões', PAGE_MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${startDate} – ${endDate}`, PAGE_MARGIN, y);
  y += 6;
  doc.text(`Total: ${formatDuration(totalSeconds)}    Faturável: ${formatCurrency(totalValue)}`, PAGE_MARGIN, y);
  y += 10;

  // Project list with percentage
  const projectGroups = groupSessions(sessions, tasks);
  const groupsWithNames = projectGroups.map(group => ({
    ...group,
    label: projects.find(p => p.id === group.key)?.name ?? 'Projeto removido',
  }));

  if (groupsWithNames.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    ensureSpace(LINE_HEIGHT + 4);
    doc.text('Projetos', PAGE_MARGIN, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      theme: 'plain',
      head: [['Projeto', 'Duração', '%']],
      body: groupsWithNames.map(group => {
        const pct = totalSeconds > 0 ? (group.durationSec / totalSeconds) * 100 : 0;
        return [group.label, formatDuration(group.durationSec), `${pct.toFixed(1)}%`];
      }),
      headStyles: {
        textColor: [107, 114, 128],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9.5,
        textColor: [31, 41, 55],
        cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
      },
      columnStyles: {
        1: { halign: 'right', cellWidth: 26 },
        2: { halign: 'right', cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Daily hours bar chart (drawn natively, mirroring the Clockify report)
  if (dailyData.length > 0) {
    const chartHeight = 55;
    ensureSpace(chartHeight + 16);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Horas por Dia', PAGE_MARGIN, y);
    y += 6;
    drawDailyHoursBarChart(doc, dailyData, PAGE_MARGIN, y, contentWidth, chartHeight);
    y += chartHeight + 10;
  }

  // Hierarchical table: Project -> Task -> Description
  ensureSpace(LINE_HEIGHT + 6);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento por Projeto / Tarefa / Descrição', PAGE_MARGIN, y);
  y += 4;

  type RowLevel = 'project' | 'task' | 'description';
  const rows: { level: RowLevel; label: string; duration: string; value: string }[] = [];

  for (const group of groupsWithNames) {
    rows.push({ level: 'project', label: group.label, duration: formatDuration(group.durationSec), value: '' });

    const project = projects.find(p => p.id === group.key);
    const rate = project?.hourlyRate ? Number(project.hourlyRate) : 0;

    for (const taskGroup of group.children) {
      rows.push({ level: 'task', label: taskGroup.label, duration: formatDuration(taskGroup.durationSec), value: '' });

      for (const descGroup of taskGroup.children) {
        const value = (descGroup.durationSec / 3600) * rate;
        rows.push({
          level: 'description',
          label: descGroup.label,
          duration: formatDuration(descGroup.durationSec),
          value: rate > 0 ? formatCurrency(value) : '',
        });
      }
    }
  }

  const LEVEL_STYLE: Record<RowLevel, { indent: number; fontSize: number; fontStyle: 'bold' | 'normal'; fill: [number, number, number]; textColor: [number, number, number] }> = {
    project: { indent: 0, fontSize: 10, fontStyle: 'bold', fill: [219, 234, 254], textColor: [30, 58, 138] },
    task: { indent: 5, fontSize: 9.5, fontStyle: 'bold', fill: [243, 244, 246], textColor: [55, 65, 81] },
    description: { indent: 10, fontSize: 9, fontStyle: 'normal', fill: [255, 255, 255], textColor: [75, 85, 99] },
  };

  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    theme: 'grid',
    head: [['Projeto / Tarefa / Descrição', 'Duração', 'Valor']],
    body: rows.map(row => [row.label, row.duration, row.value]),
    headStyles: {
      fillColor: [229, 231, 235],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    columnStyles: {
      1: { halign: 'right', cellWidth: 28 },
      2: { halign: 'right', cellWidth: 28 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = rows[data.row.index];
      const style = LEVEL_STYLE[row.level];

      data.cell.styles.fontSize = style.fontSize;
      data.cell.styles.fontStyle = style.fontStyle;
      data.cell.styles.textColor = style.textColor;
      data.cell.styles.fillColor = style.fill;
      if (data.column.index === 0) {
        data.cell.styles.cellPadding = {
          top: 2,
          bottom: 2,
          left: 3 + style.indent,
          right: 3,
        };
      }
    },
  });

  doc.save(filename);
}
