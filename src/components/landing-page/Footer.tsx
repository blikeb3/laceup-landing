import { Linkedin, Twitter, Instagram, Mail } from "lucide-react";
import logo from "@/assets/laceup-logo-with-branding.png";

export function Footer() {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-white text-[#0A2849] pt-16 pb-8 border-t border-[#0A2849]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-6">
              <img src={logo} alt="LaceUp - Wealth Beyond The Field" className="h-12 w-auto" />
            </div>
            <p className="text-[#0A2849]/70 mb-6 max-w-md leading-relaxed">
              Empowering athletes to transition beyond the game through meaningful connections, mentorship, and career opportunities.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.linkedin.com/company/laceup-network"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/laceupnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-colors"
                aria-label="Twitter/X"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com/laceupnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@laceupnetwork.com"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-[#E8B555] font-semibold">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-[#0A2849]/70 hover:text-[#E8B555] transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="text-[#0A2849]/70 hover:text-[#E8B555] transition-colors"
                >
                  Benefits
                </button>
              </li>
            </ul>
          </div>

          {/* For */}
          <div>
            <h4 className="mb-4 text-[#E8B555] font-semibold">Who We Serve</h4>
            <ul className="space-y-3 text-[#0A2849]/70">
              <li>Athletes</li>
              <li>Alumni</li>
              <li>Recruiters</li>
              <li>Businesses</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#0A2849]/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#0A2849]/60 text-sm">
            © 2025 LaceUp. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-[#0A2849]/60 hover:text-[#E8B555] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-[#0A2849]/60 hover:text-[#E8B555] transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}