import { useEffect, useState } from 'react';

const normalizeHash = () => {
  const value = window.location.hash.replace(/^#/, '') || '/';
  return value.startsWith('/') ? value : `/${value}`;
};

export const useHashRoute = () => {
  const [route, setRoute] = useState(normalizeHash);

  useEffect(() => {
    const handleHashChange = () => setRoute(normalizeHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
};
