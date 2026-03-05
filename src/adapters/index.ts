import type { TabEngineFactory } from '@domain/tab-engine';
import { AlphaTabEngine } from './alphatab/AlphaTabEngine';
import { MockTabEngine } from './mock/MockTabEngine';

export const createTabEngine: TabEngineFactory = () => {
  const useMock =
    import.meta.env.VITE_USE_MOCK_ENGINE === 'true' ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mockEngine'));

  if (useMock) {
    return new MockTabEngine();
  }

  return new AlphaTabEngine();
};
