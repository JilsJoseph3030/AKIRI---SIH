import React from 'react';
import { render } from '@testing-library/react-native';
import { UnitEconomicsCard } from '../components/UnitEconomicsCard';
import { expect, test, describe } from 'vitest';

describe('UnitEconomicsCard Core Calculations', () => {
  test('calculates and renders exactly 40.6% margin increase for PCB High Grade', () => {
    const { getByText } = render(<UnitEconomicsCard material="PCB_HIGH_GRADE" weightKg={10} />);
    
    // Informal: 320 * 10 = 3200
    // Akiri Direct: 450 * 10 = 4500
    // Margin: 1300
    // Percentage: (1300 / 3200) * 100 = 40.6%
    
    expect(getByText('₹3200.00')).toBeTruthy();
    expect(getByText('₹4500.00')).toBeTruthy();
    expect(getByText('+₹1300.00')).toBeTruthy();
    expect(getByText('(40.6% Higher Payout)')).toBeTruthy();
  });

  test('calculates accurate 50% margin surge for Li-Ion Batteries', () => {
    const { getByText } = render(<UnitEconomicsCard material="LI_ION_BATTERY" weightKg={5} />);
    
    // Informal: 80 * 5 = 400
    // Akiri Direct: 120 * 5 = 600
    // Margin: 200
    // Percentage: 50.0%
    
    expect(getByText('+₹200.00')).toBeTruthy();
    expect(getByText('(50.0% Higher Payout)')).toBeTruthy();
  });
});
