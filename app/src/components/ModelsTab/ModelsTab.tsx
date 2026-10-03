import { ModelManagement } from '@/components/ServerSettings/ModelManagement';

export function ModelsTab() {
  return (
    <div className="h-full flex flex-col py-4">
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex-1 min-h-0 flex flex-col overflow-hidden">
        <ModelManagement />
      </div>
    </div>
  );
}
