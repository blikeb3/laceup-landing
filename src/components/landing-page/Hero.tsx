import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";


export function Hero() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0A2849] via-[#154170] to-[#0A2849]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl text-white leading-tight">
              Your Next Chapter <span className="text-[#E8B555]">starts here</span>
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Join A community built to help athletes transition from competition to career
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button
          size="lg"
          className="bg-[#E8B555] text-[#0A2849] hover:bg-[#F2C877] text-xl px-12 py-7 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
          onClick={() => navigate('/auth?tab=signup')}
        >
          Join Now
          <ArrowRight className="ml-2 w-6 h-6" />
        </Button>
            <Button
              size="lg"
              className="bg-[#E8B555] text-[#0A2849] hover:bg-[#F2C877] text-xl px-12 py-7 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
              onClick={() => scrollToSection('why-we-exist')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}