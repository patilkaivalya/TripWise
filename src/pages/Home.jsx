import {
  Plane,
  Hotel,
  MapPinned,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import Navbar from "../components/Navbar";
import TripForm from "../components/TripForm";

function Home() {
  return (
    <div id="home" className="min-h-screen bg-slate-50">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white">
          {/* Background decoration */}
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute -right-32 top-10 h-96 w-96 rounded-full bg-sky-100/60 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 text-center lg:px-8 lg:pb-24 lg:pt-20">
            {/* Badge */}
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <Sparkles size={16} />
              AI-powered travel planning
            </div>

            {/* Heading */}
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Plan smarter.
              <span className="block text-blue-600">
                Travel better.
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Tell us where you want to go, when you want to travel, and how
              much you want to spend. TripWise brings together travel options,
              local experiences and intelligent recommendations to help you
              build a trip that actually fits your plans.
            </p>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Compare travel options, discover highly-rated places and get a
              personalized itinerary — all in one place.
            </p>

            {/* Feature highlights */}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <HeroBadge text="Live travel search" />
              <HeroBadge text="Budget-aware planning" />
              <HeroBadge text="Personalized itinerary" />
            </div>
          </div>
        </section>

        {/* Trip Planner */}
        <TripForm />

        {/* How It Works */}
        <section
          id="how-it-works"
          className="bg-white px-5 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                How it works
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                From travel idea to complete plan
              </h2>

              <p className="mt-4 text-slate-500">
                TripWise brings together the information you need to make
                better travel decisions without jumping between multiple
                websites.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Plane size={24} />}
                number="01"
                title="Find Flights"
                description="Discover suitable flight options based on your destination, dates and travel preferences."
              />

              <FeatureCard
                icon={<Hotel size={24} />}
                number="02"
                title="Compare Hotels"
                description="Explore accommodation options while considering price, rating and location."
              />

              <FeatureCard
                icon={<MapPinned size={24} />}
                number="03"
                title="Discover Places"
                description="Find attractions, restaurants and experiences that match what you enjoy."
              />

              <FeatureCard
                icon={<Sparkles size={24} />}
                number="04"
                title="Get Your Plan"
                description="Combine the best options into a budget-aware recommendation and personalized itinerary."
              />
            </div>

            {/* Trust / Data Section */}
            <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <ShieldCheck size={24} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Built around live travel information
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                TripWise uses live search data to help you compare travel
                options and make more informed decisions rather than relying
                only on static recommendations.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-950 px-5 py-8 text-center lg:px-8">
        <p className="text-sm text-slate-400">
          © 2026 TripWise AI · Plan smarter. Travel better.
        </p>
      </footer>
    </div>
  );
}

function HeroBadge({ text }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
      {text}
    </div>
  );
}

function FeatureCard({ icon, number, title, description }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
          {icon}
        </div>

        <span className="text-sm font-bold text-slate-300">
          {number}
        </span>
      </div>

      <h3 className="mt-6 text-lg font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default Home;