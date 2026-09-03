import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="border-b p-4 flex justify-between items-center">
        <Link to="/inspections" className="font-bold">Legal Metrology</Link>
        <button onClick={logout} className="text-sm underline cursor-pointer">
          Log out
        </button>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}