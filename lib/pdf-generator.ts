import jsPDF from 'jspdf';

export interface CPCBTransactionData {
  id: string;
  cpcb_reg_number: string;
  material_category: string;
  raw_weight_kg: number;
  yield: {
    recoveredCopperKg: number;
    recoveredPreciousMetalsKg: number;
    recoveredPlasticsKg: number;
    inertResidueKg: number;
  };
}

/**
 * Generates a visually compliant CPCB Audit Certificate for Authorized Recyclers.
 * This ensures absolute transparency and mass-balance traceability across the supply chain.
 */
export const generateCPCBReceipt = (data: CPCBTransactionData) => {
  try {
    const doc = new jsPDF();

    // 1. Official Header
    doc.setFontSize(22);
    doc.setTextColor(34, 139, 34); // Forest Green
    doc.text("CPCB Audit Certificate & Yield Receipt", 20, 20);

    // 2. Regulatory Meta Data
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Certificate ID: CERT-${data.id}`, 20, 40);
    doc.text(`CPCB Reg. No: ${data.cpcb_reg_number}`, 20, 48);
    doc.text(`Timestamp: ${new Date().toLocaleString()}`, 20, 56);
    
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    // 3. Physical Intake Details
    doc.setFontSize(14);
    doc.text("Lot Intake Verification", 20, 70);
    doc.setFontSize(12);
    doc.text(`Material Category: ${data.material_category}`, 20, 80);
    doc.text(`Confirmed Raw Intake Weight: ${data.raw_weight_kg} kg`, 20, 88);

    doc.line(20, 95, 190, 95);

    // 4. Traceable Mass Balance Yield
    doc.setFontSize(14);
    doc.text("Mass-Balance Yield Estimation", 20, 105);
    doc.setFontSize(12);
    
    // Strict breakdown for audits
    doc.text(`Recovered Copper: ${data.yield.recoveredCopperKg.toFixed(2)} kg`, 30, 115);
    doc.text(`Recovered Precious Metals: ${data.yield.recoveredPreciousMetalsKg.toFixed(2)} kg`, 30, 123);
    doc.text(`Recovered Plastics: ${data.yield.recoveredPlasticsKg.toFixed(2)} kg`, 30, 131);
    doc.text(`Inert Residue (Slag/Glass): ${data.yield.inertResidueKg.toFixed(2)} kg`, 30, 139);

    doc.line(20, 150, 190, 150);
    
    // 5. Official Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("This is an electronically generated CPCB compliance certificate.", 20, 160);
    doc.text("Valid for regulatory audits and E-Waste manifest tracking.", 20, 165);

    // Trigger Browser Download
    doc.save(`CPCB_Certificate_${data.id}.pdf`);
    
    console.log(`Generated PDF for ${data.id}`);
  } catch (error) {
    console.error("PDF Generation Failed:", error);
  }
};
