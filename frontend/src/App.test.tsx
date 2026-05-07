import React from 'react';
import { render } from '@testing-library/react';

jest.mock('./components/common/AuroraBackground', () => ({
  AuroraBackground: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import App from './App';

test('renders app shell without crashing', () => {
  expect(() => render(<App />)).not.toThrow();
});
