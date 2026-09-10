import { expect, test, describe } from 'vitest';
import { CPCBYieldEngine, validateDensityAndCompleteness } from '../lib/cpcb-engine';

describe('CPCBYieldEngine', () => {
  test('calculates yield for PCB_HIGH_GRADE correctly', () => {
    const result = CPCBYieldEngine.calculateYield('PCB_HIGH_GRADE', 100);
    expect(result.recoveredCopperKg).toBe(18);
    expect(result.recoveredPreciousMetalsKg).toBe(2);
    expect(result.recoveredPlasticsKg).toBe(30);
    expect(result.inertResidueKg).toBe(50);
  });

  test('calculates yield for CRT_GLASS correctly', () => {
    const result = CPCBYieldEngine.calculateYield('CRT_GLASS', 50);
    expect(result.recoveredCopperKg).toBe(0);
    expect(result.recoveredPreciousMetalsKg).toBe(0);
    expect(result.recoveredPlasticsKg).toBe(5);
    expect(result.inertResidueKg).toBe(45);
  });

  test('calculates yield for LI_ION_BATTERY correctly', () => {
    const result = CPCBYieldEngine.calculateYield('LI_ION_BATTERY', 10);
    expect(result.recoveredCopperKg).toBe(1);
    expect(result.recoveredPreciousMetalsKg).toBe(0.5);
    expect(result.recoveredPlasticsKg).toBe(2);
    expect(result.inertResidueKg).toBe(6.5);
  });

  test('calculates yield for MIXED_EWASTE correctly', () => {
    const result = CPCBYieldEngine.calculateYield('MIXED_EWASTE', 200);
    expect(result.recoveredCopperKg).toBe(10);
    expect(result.recoveredPreciousMetalsKg).toBe(1);
    expect(result.recoveredPlasticsKg).toBe(80);
    expect(result.inertResidueKg).toBe(109);
  });
});

describe('validateDensityAndCompleteness', () => {
  test('flags density anomaly when weight significantly exceeds estimated volume weight', () => {
    // scaleWeight = 120, estimatedVolumeWeight = 100
    // (120 - 100) / 100 = 0.20 > 0.15 -> anomaly
    const result = validateDensityAndCompleteness(120, 100, 1.0, 10);
    expect(result.densityAnomalyFlag).toBe(true);
  });

  test('does not flag density anomaly when weight is within normal bounds', () => {
    // scaleWeight = 110, estimatedVolumeWeight = 100
    // (110 - 100) / 100 = 0.10 <= 0.15 -> no anomaly
    const result = validateDensityAndCompleteness(110, 100, 1.0, 10);
    expect(result.densityAnomalyFlag).toBe(false);
  });

  test('calculates correct final payout amount with completeness score', () => {
    // scaleWeight = 100, completeness = 0.8, baseRate = 50
    // payout = 100 * 50 * 0.8 = 4000
    const result = validateDensityAndCompleteness(100, 100, 0.8, 50);
    expect(result.finalPayoutAmt).toBe(4000);
    expect(result.densityAnomalyFlag).toBe(false);
  });
});
