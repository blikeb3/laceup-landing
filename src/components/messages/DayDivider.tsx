import { formatDateLong } from "@/lib/dateFormat";
import { MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DayDividerProps = {
  date: string | Date;
  onDeleteBefore?: (date: Date) => void;
};

export const DayDivider = ({ date, onDeleteBefore }: DayDividerProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  // Use local date string for comparison to avoid timezone issues
  const toKey = (dt: Date) => {
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const label = (() => {
    const dayKey = toKey(d);
    const todayKey = toKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = toKey(yesterday);
    if (dayKey === todayKey) return "Today";
    if (dayKey === yesterdayKey) return "Yesterday";
    return formatDateLong(d);
  })();

  const handleDeleteBefore = () => {
    onDeleteBefore?.(d);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="my-6 flex items-center gap-2" aria-label={label} role="separator">
        <div className="flex-1 border-t border-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {label}
          </span>
          {onDeleteBefore && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={`Options for ${label}`}
                  aria-label={`Options for ${label}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top">
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Before {label}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex-1 border-t border-border" />
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Messages Before {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your messages before {label}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBefore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
