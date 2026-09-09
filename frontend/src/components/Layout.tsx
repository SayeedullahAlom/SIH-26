import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Footer from "./Footer";
import Logo from "./ui/Logo";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/inspections", label: "All Inspections" },
  { to: "/inspections/new", label: "New Inspection" },
];

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = user?.name || "Officer";
  const avatarUrl = user?.avatar_view_url;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden bg-[#F8FAFC]">
      {/* Locked / Fixed Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-xs">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5 sm:py-3">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center focus:outline-none">
            <Logo size={36} />
          </Link>

          {/* Desktop Navigation Links */}
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

          {/* Desktop Profile Button: Large Avatar + Name */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/profile"
              title="View Officer Profile"
              className={`flex items-center gap-3 pl-1.5 pr-4 py-1 rounded-2xl border text-xs font-bold tracking-wide transition-all shadow-2xs ${
                location.pathname === "/profile"
                  ? "border-[#1D3587] bg-blue-50/60 text-[#1D3587]"
                  : "border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-[#0A1329] text-white flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-zinc-200 shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-black">{initial}</span>
                )}
              </div>
              <span className="truncate max-w-[160px] font-semibold text-sm">
                {displayName}
              </span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-700 hover:text-black focus:outline-none"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
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

            {/* Mobile Profile Link */}
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-sm font-semibold border transition mt-1 ${
                location.pathname === "/profile"
                  ? "bg-blue-50 border-blue-200 text-[#1D3587]"
                  : "border-zinc-200 text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#0A1329] text-white flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-zinc-200 shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-black">{initial}</span>
                )}
              </div>
              <span className="truncate font-semibold">{displayName}</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Main Container - pt-24 offsets the fixed navbar */}
      <main className="w-full flex-1 max-w-6xl mx-auto px-6 sm:px-8 pt-24 pb-10">
        <Outlet />
      </main>

      {/* Persistent Team Footer */}
      <Footer />
    </div>
  );
}