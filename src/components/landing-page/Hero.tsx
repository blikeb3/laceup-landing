import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

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
              Life beyond the game <span className="text-[#E8B555]">starts here</span>
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Built exclusively for athletes transitioning from their sport into their careers. Connecting talent with mentors, alumni, and real professional opportunities.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="text-lg px-10 py-7 bg-[#E8B555] text-[#0A2849] hover:bg-[#F2C877] shadow-xl hover:shadow-2xl transition-all duration-300"
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