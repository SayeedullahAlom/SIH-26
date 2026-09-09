import { useState } from "react";
import { Mail, Phone, Users, X, PhoneCall, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TEAM_MEMBERS = [
  {
    name: "Shahid Afridi",
    role: "Team Member",
    phone: "6000408646",
    email: "shahidafridi44140@gmail.com",
  },
  {
    name: "Darshan Gupta",
    role: "Team Member",
    phone: "8822776046",
    email: "darshangupta78421@gmail.com",
  },
  {
    name: "Sayeedullah Alom",
    role: "Team Member",
    phone: "9863365371",
    email: "sayeedullahalom@gmail.com",
  },
  {
    name: "Arpita Singh",
    role: "Team Member",
    phone: "9122537623",
    email: "100arpitasingh100@gmail.com",
  },
  {
    name: "Binit Chanda",
    role: "Team Member",
    phone: "8403877018",
    email: "binitchanda268@gmail.com",
  },
  {
    name: "Lakhyaraj Rajkhowa",
    role: "Team Member",
    phone: "8099342398",
    email: "llakhyaraj@gmail.com",
  },
];

export default function Footer() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <footer className="w-full bg-white border-t border-zinc-200/90 mt-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          {/* Rights Reserved */}
          <p>© {new Date().getFullYear()} Legal Metrology Division. All rights reserved.</p>

          {/* Contact Us Trigger */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 font-bold text-[#1D3587] hover:underline focus:outline-none transition cursor-pointer"
          >
            <PhoneCall size={13} />
            <span>Contact Us</span>
          </button>
        </div>
      </footer>

      {/* Contact Us Modal Popup */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-white rounded-3xl border border-zinc-200 shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0A1329] text-white flex items-center justify-center font-black">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold uppercase tracking-tight text-[#0A1329]">
                      Project Development & Support Team
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Reach out directly for application queries or system support
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Contact List */}
              <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEAM_MEMBERS.map((member) => (
                  <div
                    key={member.email}
                    className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 flex flex-col gap-2 hover:border-zinc-300 transition"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-[#0A1329]">
                        {member.name}
                      </h4>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                        {member.role}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-zinc-600 mt-1">
                      <a
                        href={`tel:${member.phone}`}
                        className="flex items-center gap-2 hover:text-[#1D3587] transition font-medium"
                      >
                        <Phone size={13} className="text-zinc-400 shrink-0" />
                        <span>+91 {member.phone}</span>
                      </a>
                      <a
                        href={`mailto:${member.email}`}
                        className="flex items-center gap-2 hover:text-[#1D3587] transition truncate"
                        title={member.email}
                      >
                        <Mail size={13} className="text-zinc-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#1D3587]" />
                  <span>Legal Metrology Technical Desk</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-xs font-bold text-zinc-600 hover:text-black transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}