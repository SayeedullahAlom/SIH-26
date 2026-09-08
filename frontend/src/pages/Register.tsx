import { useState } from "react";
import type { SyntheticEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", { name, email, password, role: "officer" });
      navigate("/login");
    } catch {
      setError("Registration failed. Email may already be in use.");
    }
  };

  const inputClass =
    "w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-[#0A1329] placeholder:text-zinc-400 focus:outline-none focus:border-[#2386F8] focus:ring-4 focus:ring-[#2386F8]/10 transition-all";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="p-8 md:p-10">
          <div className="w-12 h-12 rounded-xl bg-[#0A1329] text-white flex items-center justify-center font-display font-black text-xl mb-6 shadow-md">
            E
          </div>

          <h1 className="text-2xl md:text-3xl uppercase tracking-tight text-[#0A1329]">
            Create <span className="text-[#1D3587]">Account</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1 mb-8">
            Register as an inspection officer
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Officer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Official Email
              </label>
              <input
                type="email"
                placeholder="officer@metrology.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-lg p-3">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-3 w-full py-3.5">
              Register <ArrowRight size={15} />
            </Button>
          </form>

          <p className="text-xs font-medium text-zinc-500 mt-8 text-center">
            Already registered?{" "}
            <Link to="/login" className="text-[#1D3587] font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}