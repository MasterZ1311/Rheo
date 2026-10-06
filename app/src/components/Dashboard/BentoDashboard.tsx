import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Mic,
  Plus,
  Trash2,
} from 'lucide-react';
import { useHistory } from '@/lib/hooks/useHistory';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { cn } from '@/lib/utils/cn';
import { useServerStore } from '@/stores/serverStore';
import { useUIStore } from '@/stores/uiStore';
import { DashboardHeader } from './DashboardHeader';

export function BentoDashboard() {
  const navigate = useNavigate();
  const setProfileDialogOpen = useUIStore((s) => s.setProfileDialogOpen);
  const setSelectedVoiceId = useUIStore((s) => s.setSelectedVoiceId);
  const setSelectedProfileId = useUIStore((s) => s.setSelectedProfileId);
  const serverUrl = useServerStore((s) => s.serverUrl);

  const [searchQuery, setSearchQuery] = useState('');

  // ─── Track R1: Live Data Sources ───────────────────────────────────────────
  const { data: profiles, isLoading: isLoadingProfiles } = useProfiles();
  const { data: historyData, isLoading: isLoadingHistory } = useHistory({ limit: 50 });

  // ─── 1. Calendar State & Date Math ─────────────────────────────────────────
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
      calendarDate,
    );
  }, [calendarDate]);

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Calculate days with generation activity from history
  const generationCountByDay = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!historyData?.items) return counts;

    for (const item of historyData.items) {
      if (!item.created_at) continue;
      const d = new Date(item.created_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayNum = d.getDate();
        counts[dayNum] = (counts[dayNum] || 0) + 1;
      }
    }
    return counts;
  }, [historyData, year, month]);

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { num: number; inMonth: boolean; hasActivity: boolean; count: number }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        num: daysInPrevMonth - i,
        inMonth: false,
        hasActivity: false,
        count: 0,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const count = generationCountByDay[i] || 0;
      days.push({
        num: i,
        inMonth: true,
        hasActivity: count > 0,
        count,
      });
    }

    // Next month padding to round out weeks
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        num: i,
        inMonth: false,
        hasActivity: false,
        count: 0,
      });
    }

    return days;
  }, [year, month, generationCountByDay]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  // ─── 2. Priority Streams (Tasks) from uiStore ─────────────────────────────
  const dashboardTasks = useUIStore((s) => s.dashboardTasks);
  const toggleDashboardTask = useUIStore((s) => s.toggleDashboardTask);
  const addDashboardTask = useUIStore((s) => s.addDashboardTask);
  const deleteDashboardTask = useUIStore((s) => s.deleteDashboardTask);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addDashboardTask({
      title: newTaskTitle.trim(),
      tag: 'Today',
      completed: false,
    });
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const filteredTasks = useMemo(() => {
    if (!dashboardTasks) return [];
    if (!searchQuery.trim()) return dashboardTasks;
    return dashboardTasks.filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [dashboardTasks, searchQuery]);

  // ─── 3. Project Directory (Voice Projects) from Profiles ──────────────────
  const filteredProjects = useMemo(() => {
    if (!profiles) return [];
    const list = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      language: p.language || 'en',
      generations: p.generation_count || 0,
      samples: p.sample_count || 0,
      avatar: p.avatar_path ? `${serverUrl}/profiles/${p.id}/avatar` : null,
    }));

    if (!searchQuery.trim()) return list.slice(0, 5);
    return list
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5);
  }, [profiles, searchQuery, serverUrl]);

  // ─── 4. Studio Notes / Recent Generations ─────────────────────────────────
  const recentGenerations = useMemo(() => {
    if (!historyData?.items) return [];
    const list = historyData.items.slice(0, 2);
    if (!searchQuery.trim()) return list;
    return list.filter(
      (item) =>
        item.profile_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.text.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [historyData, searchQuery]);

  // ─── 5. Voice Personas Grid ────────────────────────────────────────────────
  const personaProfiles = useMemo(() => {
    if (!profiles) return [];
    return profiles.slice(0, 4);
  }, [profiles]);

  const avatarColors = ['bg-amber-600', 'bg-teal-600', 'bg-indigo-600', 'bg-slate-700'];

  return (
    <div className="flex-1 w-full h-full min-h-0 overflow-y-auto px-4 md:px-8 py-4 flex flex-col justify-start">
      {/* Top Header */}
      <DashboardHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-8">
        {/* ── ROW 1 ────────────────────────────────────────────────────────── */}

        {/* Card 1: Resonance Calendar (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#111827]">{monthLabel}</h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="h-6 w-6 rounded-full bg-[#111827] hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
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
            <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center text-xs font-medium">
              {calendarDays.map((d, i) => {
                const isSelected = d.inMonth && d.num === selectedDay;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => d.inMonth && setSelectedDay(d.num)}
                    className={cn(
                      'relative h-7 w-7 rounded-full flex flex-col items-center justify-center mx-auto transition-all cursor-pointer',
                      !d.inMonth && 'text-[#CBD5E1] cursor-default',
                      d.inMonth && !isSelected && 'text-[#374151] hover:bg-[#F3F4F6]',
                      isSelected && 'bg-[#F97316] text-white font-bold shadow-xs',
                    )}
                  >
                    <span>{d.num}</span>
                    {d.hasActivity && !isSelected && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#F97316]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Activity Footer */}
          <div className="pt-3 mt-3 border-t border-black/[0.03] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F97316]" />
              {generationCountByDay[selectedDay]
                ? `${generationCountByDay[selectedDay]} generations on Day ${selectedDay}`
                : `Day ${selectedDay} · No activity`}
            </span>
            <button
              type="button"
              onClick={() => navigate({ to: '/stories' })}
              className="font-semibold text-[#F97316] hover:underline cursor-pointer"
            >
              Timeline &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Priority Streams / Urgent Tasks (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#111827]">Priority Streams</h2>
              <button
                type="button"
                onClick={() => setIsAddingTask(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New task</span>
              </button>
            </div>

            {/* Add Task Input Form */}
            {isAddingTask && (
              <form onSubmit={handleAddTask} className="mb-4 flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Task title (e.g. Calibrate German voice clone)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 h-9 rounded-xl bg-[#F9FAFB] border border-black/[0.08] px-3 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
                <button
                  type="submit"
                  className="h-9 px-3 rounded-xl bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C] transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                  }}
                  className="h-9 px-3 rounded-xl bg-gray-100 text-[#4B5563] text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Task List */}
            <div className="space-y-2.5">
              {filteredTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9CA3AF]">
                  {searchQuery ? 'No tasks match your search.' : 'All clear! No pending tasks.'}
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <div
                      className="flex items-center gap-3.5 flex-1 min-w-0"
                      onClick={() => toggleDashboardTask(task.id)}
                    >
                      {/* Circle Radio Trigger */}
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border flex items-center justify-center transition-all shrink-0',
                          task.completed
                            ? 'border-[#F97316] bg-[#F97316] text-white'
                            : 'border-[#CBD5E1] group-hover:border-[#94A3B8]',
                        )}
                      >
                        {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span
                        className={cn(
                          'text-xs md:text-sm font-medium transition-all truncate',
                          task.completed
                            ? 'line-through text-[#9CA3AF]'
                            : 'text-[#1F2937] group-hover:text-black',
                        )}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E11D48]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48]" />
                        {task.tag}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDashboardTask(task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-gray-400 transition-opacity"
                        title="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.03] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>
              {dashboardTasks?.filter((t) => t.completed).length || 0} of{' '}
              {dashboardTasks?.length || 0} tasks completed
            </span>
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

        {/* Card 3: Project Directory / Voices (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <h2 className="text-base font-bold text-[#111827] mb-4">Voice Streams Directory</h2>

            {isLoadingProfiles ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-8 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9CA3AF]">
                <p>No voice streams found.</p>
                <button
                  type="button"
                  onClick={() => setProfileDialogOpen(true)}
                  className="mt-2 text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                >
                  Create your first voice profile
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProfileId(p.id);
                      navigate({ to: '/studio' });
                    }}
                    className="flex items-center justify-between py-1.5 hover:bg-[#F9FAFB] px-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GitFork className="h-4 w-4 text-[#F97316] shrink-0 rotate-90" />
                      <span className="text-xs font-medium text-[#374151] group-hover:text-black truncate">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">
                        {p.language}
                      </span>
                      <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#FB923C] text-white text-[9px] font-bold flex items-center justify-center overflow-hidden">
                        {p.avatar ? (
                          <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          p.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setProfileDialogOpen(true)}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D1D5DB] bg-transparent px-4 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6] transition-colors w-fit cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add profile</span>
          </button>
        </div>

        {/* Card 4: Studio Notes / Generation Activity (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <h2 className="text-base font-bold text-[#111827] mb-4">Studio Activity</h2>

            {isLoadingHistory ? (
              <div className="space-y-3 mb-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : recentGenerations.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9CA3AF] mb-4">
                <p>No audio generations yet.</p>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/studio' })}
                  className="mt-2 text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                >
                  Generate your first voice stream &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {recentGenerations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate({ to: '/studio' })}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors cursor-pointer border border-black/[0.02] group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-7 w-7 rounded-full bg-[#0D9488] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {item.profile_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-[#6B7280] truncate">
                          {item.profile_name}
                        </p>
                        <p className="text-xs font-medium text-[#1F2937] truncate">
                          {item.text || 'Audio synthesis output'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#9CA3AF] group-hover:text-black shrink-0 ml-1 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Quick Tags */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div
              onClick={() => navigate({ to: '/studio' })}
              className="rounded-2xl bg-[#EDE9FE] p-2.5 flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer border border-[#DDD6FE]"
            >
              <span className="text-[9px] font-bold text-[#6D28D9]">#Research</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-semibold text-[#4C1D95] leading-tight">
                  Acoustic analysis
                </span>
                <ChevronRight className="h-3 w-3 text-[#6D28D9] shrink-0" />
              </div>
            </div>

            <div
              onClick={() => navigate({ to: '/studio' })}
              className="rounded-2xl bg-[#D1FAE5] p-2.5 flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer border border-[#A7F3D0]"
            >
              <span className="text-[9px] font-bold text-[#059669]">#Strategy</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-semibold text-[#065F46] leading-tight">
                  Voice cloning
                </span>
                <ChevronRight className="h-3 w-3 text-[#059669] shrink-0" />
              </div>
            </div>

            <div
              onClick={() => navigate({ to: '/studio' })}
              className="rounded-2xl bg-[#FEF3C7] p-2.5 flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer border border-[#FDE68A]"
            >
              <span className="text-[9px] font-bold text-[#D97706]">#Operations</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-semibold text-[#92400E] leading-tight">
                  Dictation batch
                </span>
                <ChevronRight className="h-3 w-3 text-[#D97706] shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Voice Personas / Team Directory (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-between select-none">
          <div>
            <h2 className="text-base font-bold text-[#111827] mb-4">Voice Personas</h2>

            {isLoadingProfiles ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : personaProfiles.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9CA3AF]">
                <Mic className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p>No voice profiles added yet.</p>
                <button
                  type="button"
                  onClick={() => setProfileDialogOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Voice Profile</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {personaProfiles.map((per, idx) => {
                  const avatarUrl = per.avatar_path
                    ? `${serverUrl}/profiles/${per.id}/avatar`
                    : null;
                  const bg = avatarColors[idx % avatarColors.length];

                  return (
                    <div
                      key={per.id}
                      onClick={() => {
                        setSelectedVoiceId(per.id);
                        navigate({ to: '/voices' });
                      }}
                      className="bg-[#F9FAFB] rounded-2xl p-3.5 flex flex-col items-center text-center border border-black/[0.02] hover:bg-[#F3F4F6] hover:scale-[1.02] transition-all cursor-pointer shadow-xs group"
                    >
                      <div
                        className={cn(
                          'h-11 w-11 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-xs mb-2 overflow-hidden',
                          bg,
                        )}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback on image error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          per.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-[#111827] truncate w-full group-hover:text-black">
                        {per.name}
                      </h3>
                      <p className="text-[10px] text-[#6B7280] truncate w-full mt-0.5 uppercase font-medium">
                        {per.language || 'English'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
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
