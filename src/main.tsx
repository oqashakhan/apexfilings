import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { startStartupLoader } from './startupLoader';
import './index.css';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);
startStartupLoader(root);
