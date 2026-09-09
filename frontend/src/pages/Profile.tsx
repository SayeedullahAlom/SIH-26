import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  ShieldCheck,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  ArrowLeft,
  Loader2,
  Camera,
  KeyRound,
  Edit3,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

interface OfficerProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  avatar_view_url: string | null;
  created_at: string | null;
  total_inspections: number;
  compliant_count: number;
  non_compliant_count: number;
  pending_count: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { logout, refreshUser } = useAuth();

  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Name & Email State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setProfile(res.data);
      setEditName(res.data.name);
      setEditEmail(res.data.email);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Avatar Upload Handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }

    setAvatarUploading(true);

    try {
      // 1. Get presigned upload URL from backend
      const presignedRes = await api.post("/auth/avatar/presigned-url", {
        filename: file.name,
        content_type: file.type || "image/jpeg",
      });

      const { upload_url, file_key } = presignedRes.data;

      // 2. Binary PUT to Cloudflare R2
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/jpeg",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload avatar image to storage.");
      }

      // 3. Inform backend of new avatar key
      await api.put("/auth/avatar", { avatar_key: file_key });

      // 4. Reload profile & context
      await fetchProfile();
      await refreshUser();
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      alert(err.response?.data?.detail || "Could not update avatar picture.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Profile Information Save
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoSaving(true);
    setInfoMessage(null);

    try {
      await api.put("/auth/me", {
        name: editName,
        email: editEmail,
      });
      setInfoMessage({ type: "success", text: "Profile details updated successfully." });
      setIsEditingInfo(false);
      await fetchProfile();
      await refreshUser();
    } catch (err: any) {
      setInfoMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to update profile information.",
      });
    } finally {
      setInfoSaving(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordSaving(true);

    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordMessage({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setIsChangingPassword(false), 1500);
    } catch (err: any) {
      setPasswordMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to change password. Verify your current password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500 gap-2">
        <Loader2 size={24} className="animate-spin text-[#1D3587]" />
        <span className="text-sm font-medium">Loading profile...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-4xl mx-auto w-full flex flex-col gap-6 p-4"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-50 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0A1329]">
              Officer <span className="text-[#1D3587]">Profile</span>
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
              Statutory verification credentials & account security
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={handleLogout}
          className="flex items-center gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs px-4 py-2"
        >
          <LogOut size={14} /> Sign Out
        </Button>
      </div>

      {infoMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            infoMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          {infoMessage.text}
        </div>
      )}

      {/* Main Profile Info Card */}
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-white relative">
        {/* Avatar with Upload Trigger */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#0A1329] text-white flex items-center justify-center text-3xl font-black overflow-hidden shadow-md border-2 border-zinc-100">
            {profile.avatar_view_url ? (
              <img
                src={profile.avatar_view_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{profile.name ? profile.name.charAt(0).toUpperCase() : "O"}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            title="Upload Profile Photo"
            className="absolute bottom-[-6px] right-[-6px] p-2 bg-white rounded-xl shadow-md border border-zinc-200 text-zinc-700 hover:text-[#1D3587] transition cursor-pointer hover:scale-105"
          >
            {avatarUploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Profile Details or Edit Form */}
        <div className="flex flex-col gap-2 text-center sm:text-left flex-1 min-w-0">
          {!isEditingInfo ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0A1329] truncate">
                    {profile.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1D3587] border border-blue-200/60">
                    <ShieldCheck size={12} /> {profile.role}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingInfo(true)}
                  className="self-center sm:self-auto text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Edit3 size={13} /> Edit Info
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-xs text-zinc-500 mt-2">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail size={14} className="text-zinc-400" />
                  <span>{profile.email}</span>
                </div>
                {profile.created_at && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <Calendar size={14} className="text-zinc-400" />
                    <span>Enrolled {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveInfo} className="flex flex-col gap-3 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1D3587]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1D3587]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingInfo(false);
                    setEditName(profile.name);
                    setEditEmail(profile.email);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={infoSaving}
                  className="text-xs px-4 py-1.5 flex items-center gap-1"
                >
                  {infoSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Changes
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {/* Audit Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-[#1D3587]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Audits</span>
            <FileText size={16} />
          </div>
          <span className="text-2xl font-black text-[#0A1329] mt-1">{profile.total_inspections}</span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Compliant</span>
            <CheckCircle2 size={16} />
          </div>
          <span className="text-2xl font-black text-[#0A1329] mt-1">{profile.compliant_count}</span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Violations</span>
            <AlertTriangle size={16} />
          </div>
          <span className="text-2xl font-black text-[#0A1329] mt-1">{profile.non_compliant_count}</span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
            <Clock size={16} />
          </div>
          <span className="text-2xl font-black text-[#0A1329] mt-1">{profile.pending_count}</span>
        </Card>
      </div>

      {/* Security & Password Card */}
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-[#1D3587]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A1329]">
              Password & Account Security
            </h3>
          </div>
          {!isChangingPassword && (
            <Button
              variant="secondary"
              onClick={() => setIsChangingPassword(true)}
              className="text-xs px-3 py-1.5"
            >
              Change Password
            </Button>
          )}
        </div>

        {passwordMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              passwordMessage.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        {isChangingPassword && (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-lg mt-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1D3587]"
                placeholder="Enter current password"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1D3587]"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1D3587]"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordMessage(null);
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="primary"
                disabled={passwordSaving}
                className="text-xs px-4 py-1.5 flex items-center gap-1"
              >
                {passwordSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Update Password
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2">
          <div>
            <p className="text-xs font-bold text-[#0A1329]">Session Termination</p>
            <p className="text-[11px] text-zinc-500">
              Clear your token and log out of this terminal session.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs px-4 py-2 mt-2 sm:mt-0 flex items-center gap-1.5"
          >
            <LogOut size={13} /> Sign Out
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}