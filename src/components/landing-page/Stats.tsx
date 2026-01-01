import { Users, Building2, Briefcase, TrendingUp } from "lucide-react";

export function Stats() {
  const stats = [
    {
      icon: Users,
      number: "100+",
      label: "Athletes Ready to Join",
      color: "text-[#E8B555]"
    },
    {
      icon: Building2,
      number: "20+",
      label: "Business Leaders Interested",
      color: "text-white"
    },
    {
      icon: Briefcase,
      number: "3",
      label: "Divisions Represented",
      color: "text-[#E8B555]"
    },
    {
      icon: TrendingUp,
      number: "Oct 30",
      label: "Shark Tank Finalist",
      color: "text-white"
    }
  ];

  return (
    <div className="py-20 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl mb-4 text-[#0A2849]">Real Traction, Real Impact</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join a growing community of athletes and businesses transforming career transitions
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-[#E8B555]/20 to-[#E8B555]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Icon className="w-10 h-10 text-[#E8B555]" />
                </div>
                <div className="text-5xl mb-2 text-[#0A2849]">
                  {stat.number}
                </div>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}