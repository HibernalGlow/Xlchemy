import { LoaderCircle } from 'lucide-react';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'jotai';
import { initEventBridge } from '~/utils/api';

function Loading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <LoaderCircle className="animate-spin size-8" />
    </div>
  );
}

const App = lazy(() => import('./app'));

function main() {
  initEventBridge();

  const root = document.getElementById('root');

  if (!root) {
    throw new Error('no root element');
  }

  createRoot(root).render(
    <StrictMode>
      <Provider>
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      </Provider>
    </StrictMode>,
  );
}

main();
