import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Changed `FormEvent` to `FormEvent<HTMLFormElement>`
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", { name, email, password, role: "officer" });
      navigate("/login");
    } catch {
      setError("Registration failed. Email may already be in use.");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 border rounded shadow-sm">
      <h1 className="text-xl font-bold mb-4">Officer Registration</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="bg-black text-white p-2 rounded hover:bg-neutral-800">
          Register
        </button>
      </form>
      <p className="text-sm mt-3">
        Already have an account? <Link to="/login" className="underline">Log in</Link>
      </p>
    </div>
  );
}