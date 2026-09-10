export type MaterialCategory = 'PCB_HIGH_GRADE' | 'CRT_GLASS' | 'LI_ION_BATTERY' | 'MIXED_EWASTE';

export interface YieldResult {
  recoveredCopperKg: number;
  recoveredPreciousMetalsKg: number;
  recoveredPlasticsKg: number;
  inertResidueKg: number;
}

interface YieldRatios {
  copper: number;
  preciousMetals: number;
  plastics: number;
  inertResidue: number;
}

export class CPCBYieldEngine {
  // Hardcoded mass-balance multiplication ratios based on CPCB standards
  private static RATIOS: Record<MaterialCategory, YieldRatios> = {
    PCB_HIGH_GRADE: { copper: 0.18, preciousMetals: 0.02, plastics: 0.30, inertResidue: 0.50 },
    CRT_GLASS: { copper: 0.0, preciousMetals: 0.0, plastics: 0.10, inertResidue: 0.90 },
    LI_ION_BATTERY: { copper: 0.10, preciousMetals: 0.05, plastics: 0.20, inertResidue: 0.65 },
    MIXED_EWASTE: { copper: 0.05, preciousMetals: 0.005, plastics: 0.40, inertResidue: 0.545 },
  };

  /**
   * Returns precise yield fractions in kilograms based on CPCB yield standards
   */
  public static calculateYield(category: MaterialCategory, rawWeightKg: number): YieldResult {
    const ratios = this.RATIOS[category];
    return {
      recoveredCopperKg: Number((rawWeightKg * ratios.copper).toFixed(3)),
      recoveredPreciousMetalsKg: Number((rawWeightKg * ratios.preciousMetals).toFixed(3)),
      recoveredPlasticsKg: Number((rawWeightKg * ratios.plastics).toFixed(3)),
      inertResidueKg: Number((rawWeightKg * ratios.inertResidue).toFixed(3)),
    };
  }
}

export interface ValidationResult {
  densityAnomalyFlag: boolean;
  finalPayoutAmt: number;
}

/**
 * Validates against physical constraints and calculates final payout
 */
export function validateDensityAndCompleteness(
  scaleWeight: number,
  estimatedVolumeWeight: number,
  visualCompletenessScore: number,
  baseRatePerKg: number
): ValidationResult {
  // Trigger anomaly if physical weight is unexpectedly higher than volumetric weight by 15% (detects hidden lead/sand)
  const densityAnomalyFlag = (scaleWeight - estimatedVolumeWeight) / estimatedVolumeWeight > 0.15;
  
  // Compute final payout formula factoring in visual completeness reduction
  const finalPayoutAmt = Number((scaleWeight * baseRatePerKg * visualCompletenessScore).toFixed(2));
  
  return {
    densityAnomalyFlag,
    finalPayoutAmt
  };
}
