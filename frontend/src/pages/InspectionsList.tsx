import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Inspection } from "../types";

export default function InspectionsList() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/inspections").then((res) => {
      setInspections(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Inspections</h1>
        <Link to="/inspections/new" className="bg-black text-white px-3 py-2 rounded">
          + New Inspection
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {inspections.map((i) => (
          <li key={i.id}>
            <Link
              to={`/inspections/${i.id}`}
              className="border p-3 rounded flex justify-between hover:bg-gray-50"
            >
              <span>{i.product_name || "Unnamed product"}</span>
              <span className="text-sm text-gray-600">{i.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}