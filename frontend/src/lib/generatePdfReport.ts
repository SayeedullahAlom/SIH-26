import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface jsPDFWithPlugin extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface GeneratePdfProps {
  inspection: any;
  extraction: Record<string, any> | null;
  categories: any[];
  overallStatus: string | null;
  fieldLabels: Record<string, string>;
  categoryLabels: Record<string, string>;
}

// Strictly use async fetch with a cache-buster to bypass browser CORS cache conflicts
async function fetchBase64Image(url: string): Promise<string | null> {
  try {
    // Append a unique timestamp to force the browser to bypass the cached <img> version
    const cacheBustedUrl = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    const res = await fetch(cacheBustedUrl, { 
      mode: "cors", 
      cache: "no-store" 
    });
    
    if (!res.ok) {
      console.warn(`Failed to fetch image: HTTP ${res.status}`);
      return null;
    }

    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Fetch fallback failed:", err);
    return null;
  }
}

export async function generateComplianceReport({
  inspection,
  extraction,
  categories,
  overallStatus,
  fieldLabels,
  categoryLabels,
}: GeneratePdfProps) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as jsPDFWithPlugin;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isPass =
    (overallStatus || "").toUpperCase() === "PASS" ||
    (overallStatus || "").toUpperCase() === "COMPLIANT";

  const drawPageBorders = (targetDoc: jsPDF) => {
    targetDoc.setLineWidth(0.7);
    targetDoc.setDrawColor(20, 20, 20);
    targetDoc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    targetDoc.setLineWidth(0.2);
    targetDoc.rect(9.2, 9.2, pageWidth - 18.4, pageHeight - 18.4);
  };

  drawPageBorders(doc);

  // Government Letterhead
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 15, 15);
  doc.text("GOVERNMENT OF INDIA", pageWidth / 2, 22, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.text(
    "MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION",
    pageWidth / 2,
    27,
    { align: "center" }
  );

  doc.setFontSize(9.5);
  doc.text(
    "DEPARTMENT OF CONSUMER AFFAIRS — LEGAL METROLOGY DIVISION",
    pageWidth / 2,
    31.5,
    { align: "center" }
  );

  doc.setFont("times", "normal");
  doc.setFontSize(7.2);
  doc.text(
    "[Statutory Enforcement under The Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011]",
    pageWidth / 2,
    35.5,
    { align: "center" }
  );

  // Double Ornamental Dividing Rules
  doc.setLineWidth(0.5);
  doc.line(14, 38, pageWidth - 14, 38);
  doc.setLineWidth(0.15);
  doc.line(14, 39, pageWidth - 14, 39);

  // Certificate Header
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  const certTitle = isPass
    ? "CERTIFICATE OF STATUTORY VERIFICATION & COMPLIANCE"
    : "MEMORANDUM OF STATUTORY NON-COMPLIANCE & INSPECTION NOTICE";
  doc.text(certTitle, pageWidth / 2, 44.5, { align: "center" });

  // Metadata Panel Box
  doc.setLineWidth(0.25);
  doc.setDrawColor(120, 120, 120);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(14, 48, pageWidth - 28, 18, 1, 1, "FD");

  // Adjusted X coordinates to 58 (previously 48) to fix overlapping labels
  doc.setFontSize(7.5);
  doc.setFont("times", "bold");
  doc.text("DOSSIER REF ID:", 17, 53.5);
  doc.setFont("times", "normal");
  doc.text(String(inspection?.id || "N/A"), 58, 53.5);

  doc.setFont("times", "bold");
  doc.text("COMMODITY / BRAND:", 17, 59);
  doc.setFont("times", "normal");
  const prodName =
    extraction?.product_name?.value ||
    inspection?.product_name ||
    "Unnamed Commodity";
  doc.text(String(prodName).slice(0, 42), 58, 59);

  doc.setFont("times", "bold");
  doc.text("INSPECTING OFFICER ID:", 118, 53.5);
  doc.setFont("times", "normal");
  doc.text(
    inspection?.officer_id
      ? `OFFICER-UNIT-${inspection.officer_id.slice(0, 8).toUpperCase()}`
      : "FIELD-ENF-UNIT-01",
    155,
    53.5
  );

  doc.setFont("times", "bold");
  doc.text("STATUTORY STATUS:", 118, 59);
  doc.setFont("times", "bold");
  if (isPass) {
    doc.setTextColor(16, 120, 60);
    doc.text("COMPLIANT (PASSED)", 155, 59);
  } else {
    doc.setTextColor(180, 20, 20);
    doc.text("NON-COMPLIANT", 155, 59);
  }
  doc.setTextColor(20, 20, 20);

  // Section I: Verification of Mandatory Declarations
  let currentY = 70;
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text(
    "I. VERIFICATION OF MANDATORY DECLARATIONS [RULE 6, PCR 2011]",
    14,
    currentY
  );

  const declarationRows = extraction
    ? Object.entries(extraction)
        .filter(
          ([key]) =>
            ![
              "id",
              "inspection_id",
              "extraction_id",
              "created_at",
              "updated_at",
            ].includes(key)
        )
        .map(([key, field]) => {
          const label =
            fieldLabels[key] || key.replace(/_/g, " ").toUpperCase();

          const finalVal =
            typeof field === "object" && field !== null && "value" in field
              ? field.value
              : typeof field === "object"
              ? JSON.stringify(field)
              : String(field ?? "—");

          const rawVal =
            typeof field === "object" && field !== null && "raw_value" in field
              ? field.raw_value
              : null;

          const isEdited = Boolean(
            typeof field === "object" && field !== null && field.is_edited
          );

          const isMissing =
            !finalVal ||
            finalVal === "—" ||
            finalVal === "null" ||
            String(finalVal).toUpperCase() === "NOT DECLARED";

          let valueText = isMissing ? "NOT DECLARED" : String(finalVal);
          if (isEdited && rawVal && String(rawVal) !== String(finalVal)) {
            valueText = `${finalVal} [Officer Verified; AI: ${rawVal}]`;
          } else if (isEdited) {
            valueText = `${finalVal} [Officer Verified]`;
          }

          let findingText = "Declared";
          if (isMissing) {
            findingText = "Missing";
          } else if (
            typeof field === "object" &&
            field?.status &&
            String(field.status).toUpperCase().includes("FAIL")
          ) {
            findingText = "Non-Standard";
          }

          return [label, valueText, findingText];
        })
    : [];

  autoTable(doc, {
    startY: currentY + 3,
    head: [
      [
        "Statutory Declaration Parameter",
        "Declared Value on Packaging Label",
        "Verification Finding",
      ],
    ],
    body:
      declarationRows.length > 0
        ? declarationRows
        : [["No declarations extracted", "—", "—"]],
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [10, 10, 10],
      font: "times",
      fontStyle: "bold",
      fontSize: 7.5,
      lineWidth: 0.2,
      lineColor: [90, 90, 90],
    },
    bodyStyles: {
      font: "times",
      fontSize: 7,
      textColor: [20, 20, 20],
      lineWidth: 0.1,
      lineColor: [180, 180, 180],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold" },
      1: { cellWidth: 106 },
      2: { cellWidth: 28, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        if (data.cell.raw === "Missing" || data.cell.raw === "Non-Standard") {
          data.cell.styles.textColor = [190, 20, 20];
          data.cell.styles.fontStyle = "bold";
        } else if (data.cell.raw === "Declared") {
          data.cell.styles.textColor = [16, 120, 40];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    theme: "plain",
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  // Section II: Statutory Compliance Determination & Overrides
  currentY = (doc.lastAutoTable?.finalY ?? currentY) + 7;

  if (currentY > 218) {
    doc.addPage();
    drawPageBorders(doc);
    currentY = 16;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text(
    "II. STATUTORY COMPLIANCE DETERMINATION & RULE FINDINGS",
    14,
    currentY
  );

  const checklistRows = categories.map((cat: any) => {
    const title =
      categoryLabels[cat.category] ||
      cat.category?.replace(/_/g, " ").toUpperCase();

    const isOverridden = Boolean(
      cat.officer_verdict && cat.officer_verdict !== cat.verdict
    );
    const finalVerdictRaw = cat.officer_verdict || cat.verdict;

    let findingText =
      finalVerdictRaw === "PASS"
        ? "COMPLIANT"
        : finalVerdictRaw === "ISSUE"
        ? "VIOLATION"
        : "REVIEW REQ.";

    if (isOverridden) {
      findingText += ` [Overridden]`;
    }

    const ref = cat.rule_reference
      ? `\n[Statutory Provision: ${cat.rule_reference}]`
      : "";

    const remarksBlock = cat.officer_remarks
      ? `\n[Officer Remarks: ${cat.officer_remarks}]`
      : "";

    const fullReasoning = `${cat.reasoning || "—"}${ref}${remarksBlock}`;

    return [title, findingText, fullReasoning];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [
      [
        "Rule Category",
        "Statutory Finding",
        "Legal Observation & Statutory Provisions",
      ],
    ],
    body:
      checklistRows.length > 0
        ? checklistRows
        : [["No compliance rules evaluated", "—", "—"]],
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [10, 10, 10],
      font: "times",
      fontStyle: "bold",
      fontSize: 7.5,
      lineWidth: 0.2,
      lineColor: [90, 90, 90],
    },
    bodyStyles: {
      font: "times",
      fontSize: 7,
      textColor: [20, 20, 20],
      lineWidth: 0.1,
      lineColor: [180, 180, 180],
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold" },
      1: { cellWidth: 36, halign: "center" },
      2: { cellWidth: 106 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const textVal = String(data.cell.raw);
        if (textVal.includes("VIOLATION")) {
          data.cell.styles.textColor = [190, 20, 20];
          data.cell.styles.fontStyle = "bold";
        } else if (textVal.includes("COMPLIANT")) {
          data.cell.styles.textColor = [16, 120, 40];
          data.cell.styles.fontStyle = "bold";
        } else if (textVal.includes("REVIEW REQ.")) {
          data.cell.styles.textColor = [180, 100, 10];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    theme: "plain",
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  // Section III: Inspected Commodity Packaging Specimens
  const images = inspection?.images || [];
  if (images.length > 0) {
    doc.addPage();
    drawPageBorders(doc);
    currentY = 18;

    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text(
      "III. INSPECTED COMMODITY PACKAGING SPECIMENS (PHOTOGRAPHIC EXHIBITS)",
      14,
      currentY
    );
    currentY += 8;

    const imgWidth = 40;
    const imgHeight = 40;
    const gap = 6;
    let startX = 14;

    for (let i = 0; i < images.length; i++) {
      const imgObj = images[i];
      let base64Data: string | null = null;

      // Only use direct fetch with Cache-Buster to avoid Canvas Security Errors
      const imgUrl = imgObj.download_url || imgObj.url;
      if (imgUrl) {
        base64Data = await fetchBase64Image(imgUrl);
      }

      if (base64Data) {
        if (startX + imgWidth > pageWidth - 14) {
          startX = 14;
          currentY += imgHeight + 12;

          if (currentY + imgHeight > 240) {
            doc.addPage();
            drawPageBorders(doc);
            currentY = 18;
          }
        }

        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.2);
        doc.rect(startX, currentY, imgWidth, imgHeight);

        try {
          doc.addImage(
            base64Data,
            "JPEG",
            startX,
            currentY,
            imgWidth,
            imgHeight
          );
        } catch (addErr) {
          console.warn("jsPDF addImage failed:", addErr);
        }

        doc.setFont("times", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 30, 30);
        doc.text(
          `EXHIBIT ${String.fromCharCode(65 + i)}: ${(
            imgObj.side || `PANEL ${i + 1}`
          ).toUpperCase()}`,
          startX + imgWidth / 2,
          currentY + imgHeight + 4,
          { align: "center" }
        );

        startX += imgWidth + gap;
      }
    }

    currentY += imgHeight + 14;
  }

  // Section IV: Statutory Warning & Signature Box
  if (currentY > 215) {
    doc.addPage();
    drawPageBorders(doc);
    currentY = 18;
  }

  doc.setFont("times", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(40, 40, 40);
  const legalNotice =
    "NOTICE UNDER SECTION 36, LEGAL METROLOGY ACT, 2009: Whoever manufactures, packs, imports, sells, distributes, or exposes for sale any pre-packaged commodity which does not conform to the declarations on the package as stipulated by the Legal Metrology (Packaged Commodities) Rules, 2011 shall be punishable with fine which may extend to twenty-five thousand rupees, for the second offence to fifty thousand rupees, and for subsequent offence with fine up to one lakh rupees or imprisonment. This document constitutes an official statutory verification record.";
  doc.text(doc.splitTextToSize(legalNotice, pageWidth - 28), 14, currentY);

  const signY = currentY + 20;
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);

  doc.setLineWidth(0.2);
  doc.line(16, signY, 70, signY);
  doc.text("Signature / Seal of Verifying Officer", 16, signY + 4);
  doc.setFont("times", "bold");
  doc.text("Inspector of Legal Metrology", 16, signY + 7.5);

  doc.setFont("times", "normal");
  doc.line(pageWidth - 70, signY, pageWidth - 16, signY);
  doc.text("Authorized Departmental Endorsement", pageWidth - 70, signY + 4);
  doc.setFont("times", "bold");
  doc.text("Controller of Legal Metrology", pageWidth - 70, signY + 7.5);

  // Running Official Footers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageBorders(doc);

    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont("times", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      "Form IV-A / Statutory Audit Notice — The Legal Metrology (Packaged Commodities) Rules, 2011",
      14,
      pageHeight - 9
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, pageHeight - 9, {
      align: "right",
    });
  }

  const sanitizedName = (prodName || "inspection").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );
  doc.save(`GOVT_LEGAL_METROLOGY_CERTIFICATE_${sanitizedName}.pdf`);
}