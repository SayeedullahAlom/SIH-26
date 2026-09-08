export interface InspectionImage {
  id: string;
  side: string;
  download_url: string;
}

export interface ExtractionField {
  value: string | null;
  confidence: number | null;
  status: "visible" | "not_visible" | "illegible";
}

export interface ExtractionData {
  id: string;
  inspection_id: string;
  created_at: string;
  extraction_data: Record<string, ExtractionField>;
}

export interface VerdictCategory {
  category: string;
  verdict: "PASS" | "ISSUE" | "REVIEW_REQUIRED";
  reasoning: string;
  rule_reference: string | null;
}

export interface Verdict {
  inspection_id: string;
  overall_status: "PASS" | "ISSUE" | "REVIEW_REQUIRED";
  categories: VerdictCategory[];
  created_at: string;
}

export interface Inspection {
  id: string;
  product_name: string | null;
  manufacturer_hint: string | null;
  status: string;
  overall_result: string | null;
  created_at: string;
  images: InspectionImage[];
  latest_extraction?: ExtractionData | null;
  latest_verdict?: Verdict | null;
}