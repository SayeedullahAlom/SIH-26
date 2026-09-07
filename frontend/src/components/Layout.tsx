import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/inspections", label: "All Inspections" },
  { to: "/inspections/new", label: "New Inspection" },
];

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-zinc-200/80 shadow-xs">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0A1329] text-white flex items-center justify-center font-display font-black text-sm tracking-tight shadow-xs">
              E
            </div>
            <span className="font-display font-black text-base tracking-tight text-[#0A1329]">
              LEGAL METROLOGY
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-semibold tracking-wide transition-colors ${
                    active ? "text-[#1D3587] font-bold" : "text-zinc-600 hover:text-black"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={logout} className="text-xs uppercase font-bold tracking-wider px-3 py-2">
              <LogOut size={14} /> Sign out
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-700 hover:text-black focus:outline-none"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden w-full px-6 pt-2 pb-5 bg-white border-b border-zinc-200 flex flex-col gap-2 shadow-md">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                    active ? "bg-blue-50 text-[#1D3587]" : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="justify-start px-3 py-2 text-xs uppercase font-bold text-rose-600 hover:text-rose-700"
            >
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        )}
      </nav>

      {/* Main Container */}
      <main className="w-full flex-1 max-w-6xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}