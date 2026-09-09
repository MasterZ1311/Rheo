import { Search } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function DashboardHeader({ searchQuery, setSearchQuery }: DashboardHeaderProps) {
  const userName = useUIStore((s) => s.userName) || 'Juliana';
  const setUserNameModalOpen = useUIStore((s) => s.setUserNameModalOpen);

  return (
    <header className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 pt-2 select-none">
      {/* Left: Dynamic Greeting & Subtitle */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h1
            onClick={() => setUserNameModalOpen(true)}
            className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111827] cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to change your name"
          >
            Welcome, {userName}!
          </h1>
        </div>
        <p className="text-xs md:text-sm font-medium text-[#6B7280] mt-0.5">
          Here is your voice stream agenda for today
        </p>
      </div>

      {/* Center & Right: Search Input + User Profile Avatar */}
      <div className="flex items-center gap-4">
        {/* Search Bar Pill */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-10 w-64 md:w-80 rounded-2xl bg-[#EBECEF]/80 border border-black/[0.04] px-4 pr-10 text-xs md:text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#F97316]/50 focus:bg-white transition-all shadow-xs"
          />
          <Search className="absolute right-3.5 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
        </div>

        {/* User Profile Avatar */}
        <div
          onClick={() => setUserNameModalOpen(true)}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-[#EA580C] to-[#FB923C] text-white font-bold text-xs shadow-md cursor-pointer hover:scale-105 transition-transform"
          title={`Signed in as ${userName} · Click to edit`}
        >
          {userName.charAt(0).toUpperCase()}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#10B981] ring-2 ring-white" />
        </div>
      </div>
    </header>
  );
}
