import { Linkedin, Twitter, Instagram, Mail, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/laceup-logo-with-branding.png";

export function Footer() {
  const navigate = useNavigate();
  
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-gradient-to-b from-white to-slate-50 text-[#0A2849] pt-20 pb-8 border-t border-[#0A2849]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="mb-6 flex items-center gap-2">
              <img src={logo} alt="LaceUp" className="h-10 w-auto" />
              <span className="text-xl font-bold">LaceUP</span>
            </div>
            <p className="text-[#0A2849]/70 mb-8 max-w-md leading-relaxed text-sm">
              “Therefore encourage one another and build each other up, just as in fact you are doing.”
— 1 Thessalonians 5:11
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.linkedin.com/company/laceup-network"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/laceupnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-all duration-300 hover:scale-110"
                aria-label="Twitter/X"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com/laceupnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@laceupnetwork.com"
                className="w-10 h-10 bg-[#0A2849]/10 rounded-lg flex items-center justify-center hover:bg-[#E8B555] hover:text-white transition-all duration-300 hover:scale-110"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="mb-4 text-[#0A2849] font-bold text-sm uppercase tracking-widest">Platform</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-[#0A2849]/70 hover:text-[#E8B555] transition-colors text-sm font-medium"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="text-[#0A2849]/70 hover:text-[#E8B555] transition-colors text-sm font-medium"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('why-we-exist')}
                  className="text-[#0A2849]/70 hover:text-[#E8B555] transition-colors text-sm font-medium"
                >
                  Why LaceUP
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-[#0A2849]/70 hover:text-[#E8B555] transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
              </li>
            </ul>
          </div>

          {/* Users */}
          <div>
            <h4 className="mb-4 text-[#0A2849] font-bold text-sm uppercase tracking-widest">For Everyone</h4>
            <ul className="space-y-3 text-[#0A2849]/70 text-sm">
              <li className="font-medium hover:text-[#E8B555] transition-colors cursor-pointer">Athletes</li>
              <li className="font-medium hover:text-[#E8B555] transition-colors cursor-pointer">Alumni & Mentors</li>
              <li className="font-medium hover:text-[#E8B555] transition-colors cursor-pointer">Recruiters</li>
              <li className="font-medium hover:text-[#E8B555] transition-colors cursor-pointer">Employers</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#0A2849]/10 py-8"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-[#0A2849]/60 text-sm">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-[#E8B555] fill-[#E8B555]" />
            <span>for athletes • © 2025 LaceUp</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="/privacy" className="text-[#0A2849]/60 hover:text-[#E8B555] transition-colors font-medium">
              Privacy
            </a>
            <a href="/terms" className="text-[#0A2849]/60 hover:text-[#E8B555] transition-colors font-medium">
              Terms
            </a>
            <a href="/contact" className="text-[#0A2849]/60 hover:text-[#E8B555] transition-colors font-medium">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}