import { Compass, Menu, X } from "lucide-react";
import { useState } from "react";

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Compass size={21} />
          </div>

          <span className="text-xl font-bold tracking-tight text-slate-900">
            TripWise
          </span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#home"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            Home
          </a>

          <a
            href="#how-it-works"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            How It Works
          </a>

          <a
            href="#planner"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Plan a Trip
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-700 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-700"
            >
              Home
            </a>

            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-700"
            >
              How It Works
            </a>

            <a
              href="#planner"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Plan a Trip
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;