import { Header } from "../../components/landing-page/Header";
import { Hero } from "../../components/landing-page/Hero";
import { Stats } from "../../components/landing-page/Stats";
import { Partnership } from "../../components/landing-page/Partnership";
import { ValueProposition } from "../../components/landing-page/ValueProposition";
import { HowItWorks } from "../../components/landing-page/HowItWorks";
import { Benefits } from "../../components/landing-page/Benefits";
import { Testimonials } from "../../components/landing-page/Testimonials";
import { FAQ } from "../../components/landing-page/FAQ";
import { CTABanner } from "../../components/landing-page/CTABanner";
import { AboutUs } from "../../components/landing-page/AboutUs";
import { Footer } from "../../components/landing-page/Footer";
import { BackToTop } from "../../components/landing-page/BackToTop";
import { Toaster } from "../../components/ui/sonner";
import { SEOHead } from "../../components/landing-page/SEOHead";


export default function LandingPage() {
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