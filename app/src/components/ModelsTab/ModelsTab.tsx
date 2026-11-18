import { ModelManagement } from '@/components/ServerSettings/ModelManagement';

export function ModelsTab() {
  return (
    <div className="h-full flex flex-col py-4">
      <div className="bg-white dark:bg-[#171A27] rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-black/[0.04] dark:border-white/[0.08] flex-1 min-h-0 flex flex-col overflow-hidden">
        <ModelManagement />
      </div>
    </div>
  );
}
