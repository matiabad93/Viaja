import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import {PWAStatus} from '../components/pwa-status';
import {AppErrorBoundary} from '../components/app-error-boundary';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<AppErrorBoundary><PWAStatus/><Home/></AppErrorBoundary>);
