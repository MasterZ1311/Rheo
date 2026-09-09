import { useEffect, useState } from 'react';
import { Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores/uiStore';
import rheoLogo from '@/assets/logo.png';

export function UserNameModal() {
  const userName = useUIStore((s) => s.userName);
  const setUserName = useUIStore((s) => s.setUserName);
  const userNameModalOpen = useUIStore((s) => s.userNameModalOpen);
  const setUserNameModalOpen = useUIStore((s) => s.setUserNameModalOpen);

  const [inputVal, setInputVal] = useState('');
  const [open, setOpen] = useState(false);

  // Automatically prompt on first run if name is not set
  useEffect(() => {
    if (!userName) {
      setOpen(true);
    } else if (userNameModalOpen) {
      setInputVal(userName);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [userName, userNameModalOpen]);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) {
      setUserName(trimmed);
    } else {
      setUserName('Juliana');
    }
    setOpen(false);
    setUserNameModalOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !userName) {
          // Default to Juliana if closed without entry
          setUserName('Juliana');
        }
        setOpen(next);
        setUserNameModalOpen(next);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 border border-foreground/10 p-2 shadow-xs">
            <img src={rheoLogo} alt="Rheo" className="h-10 w-10 object-contain rounded-full" />
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F97316] text-white shadow-xs">
              <Sparkles className="h-2.5 w-2.5" />
            </div>
          </div>

          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Welcome to Rheo Studio
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              What should we call you? Enter your name to personalize your acoustic workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="w-full space-y-4 pt-2">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Your name (e.g. Juliana)"
                className="pl-10 h-11 rounded-xl border-border/80 bg-muted/40 text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#F97316]"
              />
            </div>

            <DialogFooter className="sm:justify-end gap-2 pt-1">
              <Button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs tracking-wide shadow-md transition-all active:scale-[0.98]"
              >
                Enter Studio &rarr;
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
