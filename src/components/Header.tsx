import { useState } from "react";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import newLogo from "figma:asset/e2d0d0da8311e96120b81e0ce3d9068dc1ce6b99.png";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-[#0A2849]/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={newLogo} alt="LaceUp" className="h-12 w-auto" />
            <span className="ml-3 text-2xl text-[#0A2849]">LaceUp</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-[#0A2849]/70 hover:text-[#0A2849] transition-colors"
            >
              How It Works
            </button>
            <button 
              onClick={() => scrollToSection('benefits')}
              className="text-[#0A2849]/70 hover:text-[#0A2849] transition-colors"
            >
              Benefits
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-[#0A2849]/70 hover:text-[#0A2849] transition-colors"
            >
              About
            </button>
            <div className="flex items-center gap-3">
              <Button 
                size="default" 
                variant="outline"
                className="border-[#0A2849] text-[#0A2849] hover:bg-[#0A2849]/5"
              >
                Sign In
              </Button>
              <Button 
                size="default" 
                className="bg-[#E8B555] text-[#0A2849] hover:bg-[#F2C877] px-6 shadow-md hover:shadow-lg transition-all duration-300"
              >
                Sign Up
              </Button>
            </div>
          </nav>

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
          <nav className="md:hidden py-4 border-t border-[#0A2849]/10">
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="text-left px-4 py-2 text-muted-foreground hover:text-[#0A2849] transition-colors"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection('benefits')}
                className="text-left px-4 py-2 text-muted-foreground hover:text-[#0A2849] transition-colors"
              >
                Benefits
              </button>
              <button 
                onClick={() => scrollToSection('about')}
                className="text-left px-4 py-2 text-muted-foreground hover:text-[#0A2849] transition-colors"
              >
                About
              </button>
              <div className="flex flex-col gap-3 px-4">
                <Button 
                  variant="outline"
                  className="border-[#0A2849] text-[#0A2849] hover:bg-[#0A2849]/5"
                >
                  Sign In
                </Button>
                <Button 
                  className="bg-[#E8B555] text-[#0A2849] hover:bg-[#E8B555]/90"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}