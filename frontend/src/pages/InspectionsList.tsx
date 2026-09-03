import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Inspection {
  id: string;
  product_name: string | null;
  status: string;
  overall_result: string | null;
  created_at: string;
}

export default function InspectionsList() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/inspections")
      .then((res) => setInspections(res.data))
      .catch((err) => console.error("Failed to load inspections", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6">Loading inspections...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Inspections</h1>
        <Link to="/inspections/new" className="bg-black text-white px-3 py-2 rounded text-sm hover:bg-neutral-800">
          + New Inspection
        </Link>
      </div>
      {inspections.length === 0 ? (
        <p className="text-gray-500 border p-4 rounded text-center">No inspections found.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {inspections.map((i) => (
            <li key={i.id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <p className="font-semibold">{i.product_name || "Unnamed product"}</p>
                <p className="text-xs text-gray-500">{new Date(i.created_at).toLocaleString()}</p>
              </div>
              <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded">{i.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}