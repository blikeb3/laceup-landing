import { Card } from "../ui/card";


export function AboutUs() {

  return (
    <div id="about" className="py-24 bg-gradient-to-br from-[#0A2849] via-[#154170] to-[#0A2849] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#E8B555] rounded-full blur-3xl opacity-5"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[#E8B555] rounded-full blur-3xl opacity-5"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-5xl mb-6 text-white">Built by Athletes, For Athletes</h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            LaceUp exists to help athletes turn discipline, work ethic, and experience into opportunity beyond the game.
          </p>
        </div>
      </div>
    </div>
  );
}
