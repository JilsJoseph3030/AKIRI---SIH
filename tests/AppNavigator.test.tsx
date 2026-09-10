import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../navigation/AppNavigator';
import * as auth from '../lib/auth';
import { vi, expect, test, describe } from 'vitest';

vi.mock('../lib/auth', () => ({
  getCurrentSession: vi.fn()
}));

// Mock @react-navigation native components safely for testing
vi.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({children}: any) => <>{children}</>
  };
});
vi.mock('@react-navigation/bottom-tabs', () => {
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({children}: any) => <>{children}</>,
      Screen: ({name}: any) => <>{name}</>
    })
  };
});
vi.mock('@react-navigation/native-stack', () => {
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({children}: any) => <>{children}</>,
      Screen: ({name, component, children}: any) => {
        if (children) return children();
        if (component) return React.createElement(component);
        return <>{name}</>;
      }
    })
  };
});

describe('AppNavigator RBAC Routing', () => {
  test('renders Login Screen when no authenticated session exists', async () => {
    vi.spyOn(auth, 'getCurrentSession').mockResolvedValueOnce(null);
    const { getByText } = render(<AppNavigator />);
    await waitFor(() => {
      expect(getByText('Login Screen')).toBeTruthy();
    });
  });

  test('renders Main Tabs including TransactionLedger for AGGREGATOR_HUB roles', async () => {
    vi.spyOn(auth, 'getCurrentSession').mockResolvedValueOnce({ role: 'AGGREGATOR_HUB' } as any);
    const { getByText } = render(<AppNavigator />);
    await waitFor(() => {
      expect(getByText('TransactionLedger')).toBeTruthy();
    });
  });

  test('hides TransactionLedger entirely for INDEPENDENT_KABADIWALA roles', async () => {
    vi.spyOn(auth, 'getCurrentSession').mockResolvedValueOnce({ role: 'INDEPENDENT_KABADIWALA' } as any);
    const { getByText, queryByText } = render(<AppNavigator />);
    await waitFor(() => {
      expect(getByText('ScaleIngestion')).toBeTruthy();
      expect(queryByText('TransactionLedger')).toBeNull();
    });
  });
});
