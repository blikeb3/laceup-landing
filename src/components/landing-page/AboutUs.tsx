import { Card } from "../ui/card";
import loganHeadshot from "@/assets/logan-headshot.png";
import hudsonHeadshot from "@/assets/hudson-headshot.png";


export function AboutUs() {
  const founders = [
    {
      name: "Logan Lacey",
      title: "CEO & Co-Founder",
      description: "Decorated DII athlete with a background in wealth management and accounting. Logan understands the unique financial and professional challenges athletes face during transition.",
      headshot: loganHeadshot
    },
    {
      name: "Hudson Vaughn",
      title: "COO & Co-Founder",
      description: "DII athlete with expertise in marketing, sales, and an MSIS degree. Hudson serves as an NCAA representative and brings deep knowledge of athlete development.",
      headshot: hudsonHeadshot
    }
  ];

  return (
    <div id="about" className="py-24 bg-gradient-to-br from-[#0A2849] via-[#154170] to-[#0A2849] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#E8B555] rounded-full blur-3xl opacity-5"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[#E8B555] rounded-full blur-3xl opacity-5"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-5xl mb-6 text-white">Built by Athletes, For Athletes</h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            We're two DII athletes who've lived the transition struggle firsthand. LaceUp exists because athletes deserve a platform where their discipline, work ethic, and unique experiences are valued beyond the game.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {founders.map((founder, index) => (
            <Card key={index} className="bg-white/5 backdrop-blur-sm border-2 border-[#E8B555]/20 hover:border-[#E8B555]/50 transition-all duration-300 overflow-hidden group hover:shadow-2xl hover:shadow-[#E8B555]/10">
              <div className="relative">
                {/* Headshot */}
                <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#E8B555]/10 to-transparent">
                  <img
                    src={founder.headshot}
                    alt={`${founder.name} - ${founder.title}`}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="mb-4">
                    <h3 className="text-2xl text-white mb-2">{founder.name}</h3>
                    <p className="text-[#E8B555] text-lg mb-4">{founder.title}</p>
                  </div>
                  <p className="text-white/80 leading-relaxed text-lg">
                    {founder.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
