import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

/**
 * PasswordRequirements Component
 * 
 * Displays real-time password requirement validation with visual indicators.
 * Shows users exactly what's needed for a secure password.
 */
export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
  const requirements: PasswordRequirement[] = [
    {
      label: "At least 8 characters long",
      met: password.length >= 8,
    },
    {
      label: "Contains an uppercase letter (A-Z)",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains a lowercase letter (a-z)",
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains a number (0-9)",
      met: /[0-9]/.test(password),
    },
  ];

  const allMet = requirements.every(req => req.met);

  // Only show if user has started typing
  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-2 p-3 rounded-md border border-slate-600", className)}>
      <p className="text-sm font-medium text-slate-300 mb-2">
        Password Requirements:
      </p>
      <div className="space-y-1.5">
        {requirements.map((requirement, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              requirement.met ? "text-green-400" : "text-slate-400"
            )}
          >
            {requirement.met ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{requirement.label}</span>
          </div>
        ))}
      </div>
      {allMet && (
        <div className="flex items-center gap-2 text-sm text-green-400 pt-2 border-t border-slate-600 mt-3">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">All requirements met! ✓</span>
        </div>
      )}
    </div>
  );
}
