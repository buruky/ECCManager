import { Platform, useWindowDimensions } from 'react-native';

export const SIDEBAR_WIDTH = 220;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 768;
}