import React from 'react';
import AppShell from './app/AppShell';
import FixDictionaryProvider from './context/FixDictionaryProvider';

const App = () => (
  <FixDictionaryProvider>
    <AppShell />
  </FixDictionaryProvider>
);

export default App;
