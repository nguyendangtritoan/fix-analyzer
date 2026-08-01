import React from 'react';
import { ArrowRightLeft, LayoutDashboard, LockKeyhole, Network } from 'lucide-react';
import DictionaryControls from '../components/features/DictionaryControls';
import { useFixDictionary } from '../context/useFixDictionary';
import MessageAnalyzerPage from '../pages/MessageAnalyzerPage';
import VisualBoardPage from '../pages/VisualBoardPage';
import { useHashRoute } from './useHashRoute';

const navigation = [
  { path: '/', label: 'Message Analyzer', icon: ArrowRightLeft },
  { path: '/visual-board', label: 'Visual Board', icon: LayoutDashboard },
];

const AppShell = () => {
  const route = useHashRoute();
  const dictionary = useFixDictionary();
  const activeRoute = navigation.some(item => item.path === route) ? route : '/';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between xl:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <a href="#/" className="flex items-center gap-2 text-slate-800" aria-label="FIX Analyzer home">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Network size={19} />
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight">FIX Analyzer</span>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">Local workspace</span>
              </span>
            </a>

            <nav className="flex rounded-lg bg-slate-100 p-1" aria-label="Primary navigation">
              {navigation.map(item => {
                const Icon = item.icon;
                const isActive = activeRoute === item.path;
                return (
                  <a
                    key={item.path}
                    href={`#${item.path}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700" title="Imported content is processed in this browser only">
              <LockKeyhole size={13} />
              Local only
            </div>
            <DictionaryControls
              mode={dictionary.mode}
              setMode={dictionary.setMode}
              activeDict={dictionary.activeName}
              onLoadDict={dictionary.loadStandardDictionary}
              customFileName={dictionary.customFileName}
              onFileUpload={dictionary.handleFileUpload}
              onClearCustom={dictionary.clearCustomDictionary}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px]">
        {activeRoute === '/visual-board' ? <VisualBoardPage /> : <MessageAnalyzerPage />}
      </main>
    </div>
  );
};

export default AppShell;
