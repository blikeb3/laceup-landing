import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Menu, X, LogIn } from "lucide-react";
import newLogo from "@/assets/laceupLogo.png";

export function Header() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-white via-white to-white backdrop-blur-xl border-b border-[#0A2849]/8 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer gap-2 hover:opacity-80 transition-opacity" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src={newLogo} alt="LaceUP" className="h-10 w-auto" />
            <span className="text-xl font-bold text-[#0A2849]">LaceUP</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <button
              onClick={() => scrollToSection('why-we-exist')}
              className="text-[#0A2849]/70 hover:text-[#0A2849] font-medium transition-colors text-sm"
            >
              Why LaceUP
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-[#0A2849]/70 hover:text-[#0A2849] font-medium transition-colors text-sm"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('benefits')}
              className="text-[#0A2849]/70 hover:text-[#0A2849] font-medium transition-colors text-sm"
            >
              Benefits
            </button>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-[#0A2849] hover:bg-[#0A2849]/5 font-medium flex items-center gap-2"
              onClick={() => navigate('/auth')}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#E8B555] to-[#F2C877] text-[#0A2849] hover:from-[#F2C877] hover:to-[#FCDBA8] font-bold px-6 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              onClick={() => navigate('/auth?tab=signup')}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[#0A2849]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-[#0A2849]/10 bg-gradient-to-b from-white/95 to-white/90">
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => scrollToSection('why-we-exist')}
                className="text-left px-4 py-2 text-[#0A2849]/70 hover:text-[#0A2849] font-medium transition-colors"
              >
                Why LaceUP
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left px-4 py-2 text-[#0A2849]/70 hover:text-[#0A2849] font-medium transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('benefits')}
                className="text-left px-4 py-2 text-[#0A2849]/70 hover:text-[#0A2849] font-medium transition-colors"
              >
                Benefits
              </button>
              <hr className="my-2 border-[#0A2849]/10" />
              <div className="flex flex-col gap-2 px-4">
                <Button
                  variant="outline"
                  className="border-[#0A2849] text-[#0A2849] hover:bg-[#0A2849]/5"
                  onClick={() => navigate('/auth')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#E8B555] to-[#F2C877] text-[#0A2849] hover:from-[#F2C877] hover:to-[#FCDBA8] font-bold"
                  onClick={() => navigate('/auth?tab=signup')}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}