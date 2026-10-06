import { Sparkles, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FloatingGenerateBox } from '@/components/Generation/FloatingGenerateBox';
import { HistoryTable } from '@/components/History/HistoryTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ProfileList } from '@/components/VoiceProfiles/ProfileList';

import { useImportProfile } from '@/lib/hooks/useProfiles';
import { cn } from '@/lib/utils/cn';
import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';

export function MainEditor() {
  const { t } = useTranslation();
  const audioUrl = usePlayerStore((state) => state.audioUrl);
  const isPlayerVisible = !!audioUrl;
  const scrollRef = useRef<HTMLDivElement>(null);
  const setDialogOpen = useUIStore((state) => state.setProfileDialogOpen);
  const importProfile = useImportProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.rheo.zip')) {
        toast({
          title: t('main.import.invalidTitle'),
          description: t('main.import.invalidDescription'),
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setImportDialogOpen(true);
    }
  };

  const handleImportConfirm = () => {
    if (selectedFile) {
      importProfile.mutate(selectedFile, {
        onSuccess: () => {
          setImportDialogOpen(false);
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          toast({
            title: t('main.import.successTitle'),
            description: t('main.import.successDescription'),
          });
        },
        onError: (error) => {
          toast({
            title: t('main.import.failedTitle'),
            description: error.message,
            variant: 'destructive',
          });
        },
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 overflow-hidden relative py-4">
      {/* Left Column: Voice Profiles Foundry */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col min-h-0 overflow-hidden relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04] shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Voice Foundry</h2>
            <p className="text-xs text-[#6B7280]">Select or customize neural voice clones</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              className="rounded-xl border-[#D1D5DB] text-xs font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {t('main.importVoice')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".rheo.zip"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="rounded-xl bg-[#F97316] text-white hover:bg-[#EA580C] text-xs font-semibold shadow-xs"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {t('main.createVoice')}
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={cn('flex-1 min-h-0 overflow-y-auto pb-4', isPlayerVisible && 'lg:pb-32')}
        >
          <div className="flex flex-col gap-6">
            <div className="shrink-0 flex flex-col">
              <ProfileList />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Generation History & Takes */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col min-h-0 overflow-hidden relative">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04] shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Generation Stream</h2>
            <p className="text-xs text-[#6B7280]">Recent synthesized takes and versions</p>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <HistoryTable />
        </div>
      </div>

      <FloatingGenerateBox isPlayerOpen={!!audioUrl} />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('main.import.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('main.import.dialogDescription', { name: selectedFile?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={importProfile.isPending || !selectedFile}
            >
              {importProfile.isPending ? t('main.import.importing') : t('main.import.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
