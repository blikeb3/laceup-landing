import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Partnership } from "./components/Partnership";
import { ValueProposition } from "./components/ValueProposition";
import { HowItWorks } from "./components/HowItWorks";
import { Benefits } from "./components/Benefits";
import { Testimonials } from "./components/Testimonials";
import { FAQ } from "./components/FAQ";
import { CTABanner } from "./components/CTABanner";
import { AboutUs } from "./components/AboutUs";
import { Footer } from "./components/Footer";
import { BackToTop } from "./components/BackToTop";
import { Toaster } from "./components/ui/sonner";
import { SEOHead } from "./components/SEOHead";

export default function App() {
  return (
    <div className="min-h-screen">
      <SEOHead />
      <Header />
      <Hero />
      <Stats />
      <Partnership />
      <ValueProposition />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <CTABanner />
      <FAQ />
      <AboutUs />
      <Footer />
      <BackToTop />
      <Toaster />
    </div>
  );
}