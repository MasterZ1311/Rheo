import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { DashboardHeader } from './DashboardHeader';

export function BentoDashboard() {
  const navigate = useNavigate();
  const setProfileDialogOpen = useUIStore((s) => s.setProfileDialogOpen);
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState('April 2026');
  const [selectedDay, setSelectedDay] = useState(8);

  // Urgent Tasks State
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Finish monthly voice synthesis', tag: 'Today', completed: false },
    { id: '2', title: 'Calibrate neural voice clone', tag: 'Today', completed: false },
    { id: '3', title: 'Generate keynote audio brief', tag: 'Today', completed: true },
  ]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  // Calendar Matrix for April
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const calendarDays = [
    { num: 27, inMonth: false },
    { num: 28, inMonth: false },
    { num: 29, inMonth: false },
    { num: 30, inMonth: false },
    { num: 31, inMonth: false },
    { num: 1, inMonth: true },
    { num: 2, inMonth: true },
    { num: 3, inMonth: true },
    { num: 4, inMonth: true },
    { num: 5, inMonth: true },
    { num: 6, inMonth: true },
    { num: 7, inMonth: true },
    { num: 8, inMonth: true },
    { num: 9, inMonth: true },
    { num: 10, inMonth: true },
    { num: 11, inMonth: true },
    { num: 12, inMonth: true },
    { num: 13, inMonth: true },
    { num: 14, inMonth: true },
    { num: 15, inMonth: true },
    { num: 16, inMonth: true },
    { num: 17, inMonth: true },
    { num: 18, inMonth: true },
    { num: 19, inMonth: true },
    { num: 20, inMonth: true },
    { num: 21, inMonth: true },
    { num: 22, inMonth: true },
    { num: 23, inMonth: true },
    { num: 24, inMonth: true },
    { num: 25, inMonth: true },
    { num: 26, inMonth: true },
    { num: 27, inMonth: true },
    { num: 28, inMonth: true },
    { num: 29, inMonth: true },
    { num: 30, inMonth: true },
  ];

  // Project Directory
  const projects = [
    { id: 'p1', name: 'Market research 2026', avatars: ['bg-amber-500', 'bg-blue-500'] },
    { id: 'p2', name: 'New voice proposals', avatars: ['bg-emerald-500'] },
    { id: 'p3', name: 'Brand audio sprints', avatars: ['bg-indigo-500', 'bg-pink-500'] },
    { id: 'p4', name: 'Customer experience Q3', avatars: ['bg-purple-500', 'bg-teal-500'] },
    { id: 'p5', name: 'Neural speech core', avatars: ['bg-rose-500'] },
  ];

  // Team Directory / Voice Personas
  const personas = [
    { id: 'tm1', name: 'Dana R.', role: 'Project Manager', bg: 'bg-amber-600' },
    { id: 'tm2', name: 'Elon S.', role: 'Key Account Plann.', bg: 'bg-teal-600' },
    { id: 'tm3', name: 'Nancy W.', role: 'Account Manager', bg: 'bg-indigo-600' },
    { id: 'tm4', name: 'James M.', role: 'Digital Manager', bg: 'bg-slate-700' },
  ];

  // Filter items based on search query
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex-1 w-full h-full min-h-0 overflow-y-auto px-4 md:px-8 py-4 flex flex-col justify-start">
      {/* Top Header */}
      <DashboardHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-8">
        {/* ── ROW 1 ────────────────────────────────────────────────────────── */}

        {/* Card 1: Calendar Widget (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col select-none">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#111827]">{currentMonth}</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentMonth('March 2026')}
                className="h-6 w-6 rounded-full bg-[#111827] hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth('May 2026')}
                className="h-6 w-6 rounded-full bg-[#111827] hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {daysOfWeek.map((day) => (
              <span key={day} className="text-[10px] font-bold text-[#6B7280]">
                {day}
              </span>
            ))}
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-xs font-medium">
            {calendarDays.map((d, i) => {
              const isSelected = d.inMonth && d.num === selectedDay;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => d.inMonth && setSelectedDay(d.num)}
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer',
                    !d.inMonth && 'text-[#CBD5E1] cursor-default',
                    d.inMonth && !isSelected && 'text-[#374151] hover:bg-[#F3F4F6]',
                    isSelected && 'bg-[#F97316] text-white font-bold shadow-xs',
                  )}
                >
                  {d.num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Urgent Tasks / Priority Streams (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <h2 className="text-base font-bold text-[#111827] mb-5">Urgent tasks</h2>
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Circle Radio Trigger */}
                    <div
                      className={cn(
                        'h-5 w-5 rounded-full border flex items-center justify-center transition-all',
                        task.completed
                          ? 'border-[#F97316] bg-[#F97316] text-white'
                          : 'border-[#CBD5E1] group-hover:border-[#94A3B8]',
                      )}
                    >
                      {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span
                      className={cn(
                        'text-xs md:text-sm font-medium transition-all',
                        task.completed
                          ? 'line-through text-[#9CA3AF]'
                          : 'text-[#1F2937] group-hover:text-black',
                      )}
                    >
                      {task.title}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E11D48]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48]" />
                    {task.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.03] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>{tasks.filter((t) => t.completed).length} of {tasks.length} tasks completed</span>
            <button
              type="button"
              onClick={() => navigate({ to: '/studio' })}
              className="text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
            >
              Open Studio Foundry &rarr;
            </button>
          </div>
        </div>

        {/* ── ROW 2 ────────────────────────────────────────────────────────── */}

        {/* Card 3: Project Directory (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <h2 className="text-base font-bold text-[#111827] mb-4">Project directory</h2>
            <div className="space-y-3">
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate({ to: '/studio' })}
                  className="flex items-center justify-between py-1.5 hover:bg-[#F9FAFB] px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <GitFork className="h-4 w-4 text-[#4B5563] shrink-0 rotate-90" />
                    <span className="text-xs font-medium text-[#374151]">{p.name}</span>
                  </div>
                  {/* Overlapping mini avatars */}
                  <div className="flex -space-x-1.5">
                    {p.avatars.map((av, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'h-5 w-5 rounded-full ring-2 ring-white text-[9px] font-bold text-white flex items-center justify-center',
                          av,
                        )}
                      >
                        {idx === 0 ? 'D' : 'E'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setProfileDialogOpen(true)}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D1D5DB] bg-transparent px-4 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6] transition-colors w-fit cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add more</span>
          </button>
        </div>

        {/* Card 4: New Comments (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <h2 className="text-base font-bold text-[#111827] mb-4">New comments</h2>
            <div className="space-y-3 mb-4">
              {/* Comment 1 */}
              <div
                onClick={() => navigate({ to: '/studio' })}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors cursor-pointer border border-black/[0.02]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-7 w-7 rounded-full bg-[#0D9488] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    E
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[#6B7280] truncate">
                      Elon S. in Market research 2026
                    </p>
                    <p className="text-xs font-medium text-[#1F2937] truncate">
                      Find my keynote attached in the..
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#9CA3AF] shrink-0 ml-1" />
              </div>

              {/* Comment 2 */}
              <div
                onClick={() => navigate({ to: '/studio' })}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors cursor-pointer border border-black/[0.02]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-7 w-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    D
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[#6B7280] truncate">
                      Dana R. in Market research 2026
                    </p>
                    <p className="text-xs font-medium text-[#1F2937] truncate">
                      I've added some new data. Let's..
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#9CA3AF] shrink-0 ml-1" />
              </div>
            </div>
          </div>

          {/* 3 Pastel Category Tags */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {/* Tag 1: Lavender */}
            <div
              onClick={() => navigate({ to: '/studio' })}
              className="rounded-2xl bg-[#EDE9FE] p-2.5 flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer border border-[#DDD6FE]"
            >
              <span className="text-[9px] font-bold text-[#6D28D9]">#Research</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-semibold text-[#4C1D95] leading-tight">
                  Survey design
                </span>
                <ChevronRight className="h-3 w-3 text-[#6D28D9] shrink-0" />
              </div>
            </div>

            {/* Tag 2: Mint */}
            <div
              onClick={() => navigate({ to: '/studio' })}
              className="rounded-2xl bg-[#D1FAE5] p-2.5 flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer border border-[#A7F3D0]"
            >
              <span className="text-[9px] font-bold text-[#059669]">#Strategy</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-semibold text-[#065F46] leading-tight">
                  SWOT analysis
                </span>
                <ChevronRight className="h-3 w-3 text-[#059669] shrink-0" />
              </div>
            </div>

            {/* Tag 3: Pastel Yellow */}
            <div
              onClick={() => navigate({ to: '/studio' })}
              className="rounded-2xl bg-[#FEF3C7] p-2.5 flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer border border-[#FDE68A]"
            >
              <span className="text-[9px] font-bold text-[#D97706]">#Operations</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-semibold text-[#92400E] leading-tight">
                  Structure design
                </span>
                <ChevronRight className="h-3 w-3 text-[#D97706] shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Team Directory / Voice Personas (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <h2 className="text-base font-bold text-[#111827] mb-4">Team directory</h2>
            <div className="grid grid-cols-2 gap-3">
              {personas.map((per) => (
                <div
                  key={per.id}
                  onClick={() => navigate({ to: '/voices' })}
                  className="bg-[#F9FAFB] rounded-2xl p-3.5 flex flex-col items-center text-center border border-black/[0.02] hover:bg-[#F3F4F6] hover:scale-[1.02] transition-all cursor-pointer shadow-xs"
                >
                  <div
                    className={cn(
                      'h-11 w-11 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-xs mb-2',
                      per.bg,
                    )}
                  >
                    {per.name.charAt(0)}
                  </div>
                  <h3 className="text-xs font-bold text-[#111827] truncate w-full">{per.name}</h3>
                  <p className="text-[10px] text-[#6B7280] truncate w-full mt-0.5">{per.role}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-black/[0.03] text-center">
            <button
              type="button"
              onClick={() => navigate({ to: '/voices' })}
              className="text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
            >
              View all voice profiles &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
