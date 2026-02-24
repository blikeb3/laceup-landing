import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight, Zap } from "lucide-react";

export function CTABanner() {
  const navigate = useNavigate();

  return (
    <div className="relative py-24 bg-gradient-to-br from-[#0A2849] via-[#154170] to-[#0A2849] overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#E8B555]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#E8B555]/5 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        

        <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white leading-tight">
          Ready to Launch Your Career?
        </h2>
        
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
          Join thousands of athletes who are building their professional futures on LaceUP. Start for free today.
        </p>
       
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#E8B555] to-[#F2C877] text-[#0A2849] hover:from-[#F2C877] hover:to-[#FCDBA8] font-bold text-lg px-10 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
            onClick={() => navigate('/auth?tab=signup')}
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            size="lg"
            className="bg-white text-[#0A2849] hover:bg-[#f3f4f6] font-semibold text-lg px-10 py-7 shadow-sm"
            onClick={() => navigate('/auth')}
          >
            Already a Member? Sign In
          </Button>
        </div>

        <p className="text-white/60 text-sm mt-6">
          No credit card required. Set up your profile in 5 minutes.
        </p>
      </div>
    </div>
  );
}