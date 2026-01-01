import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

export function CTABanner() {
  const navigate = useNavigate();

  return (
    <div className="relative py-24 bg-gradient-to-br from-[#E8B555] via-[#F2C877] to-[#E8B555] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwQTI4NDkiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNGgxMnYxMkgzNnptMjQgMGgxMnYxMkg2MHptMC0yNGgxMnYxMkg2MHptMCAxMmgxMnYxMkg2MHptMjQgMGgxMnYxMkg4NHptMC0xMmgxMnYxMkg4NHptMC0yNGgxMnYxMkg4NHptMCAxMmgxMnYxMkg4NHptMjQgMGgxMnYxMmgtMTJ6bTAtMTJoMTJ2MTJoLTEyem0wLTI0aDEydjEyaC0xMnptMCAxMmgxMnYxMmgtMTJ6bTI0IDBoMTJ2MTJoLTEyem0wLTEyaDEydjEyaC0xMnptMC0yNGgxMnYxMmgtMTJ6bTAgMTJoMTJ2MTJoLTEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl lg:text-4xl mb-6 text-[#0A2849]">
          Your Next Chapter Starts Here
        </h2>
        <p className="text-xl lg:text-2xl text-[#0A2849]/90 mb-10 max-w-2xl mx-auto leading-relaxed">
          Join the hundreds that have already signed up!
        </p>
        <Button
          size="lg"
          className="bg-[#0A2849] text-white hover:bg-[#154170] text-xl px-12 py-7 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
          onClick={() => navigate('/auth?tab=signup')}
        >
          Join Now
          <ArrowRight className="ml-2 w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}