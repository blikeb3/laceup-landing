import { Shield, Lock } from "lucide-react";

export function PrivacyBadge() {
  return (
    <div className="py-8 bg-[#f8fafc] border-y border-[#0A2849]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#E8B555]" />
            <span>Your data is secure</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#E8B555]" />
            <span>We never share your information</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#E8B555]">✓</span>
            <span>Early access guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
}