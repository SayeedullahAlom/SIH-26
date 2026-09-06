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

export interface ExtractionFields {
  product_name?: ExtractionField;
  generic_name?: ExtractionField;
  manufacturer_name?: ExtractionField;
  manufacturer_address?: ExtractionField;
  packer_name?: ExtractionField;
  packer_address?: ExtractionField;
  importer_name?: ExtractionField;
  importer_address?: ExtractionField;
  country_of_origin?: ExtractionField;
  net_quantity?: ExtractionField;
  net_quantity_unit?: ExtractionField;
  dimensions?: ExtractionField;
  mrp?: ExtractionField;
  unit_sale_price?: ExtractionField;
  manufacture_date?: ExtractionField;
  packing_date?: ExtractionField;
  import_date?: ExtractionField;
  best_before_or_use_by?: ExtractionField;
  consumer_care?: ExtractionField;
  batch_or_lot_number?: ExtractionField;
}

export interface ExtractionData {
  inspection_id: string;
  extraction_id: string;
  extraction: ExtractionFields;
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
}