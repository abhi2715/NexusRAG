import NexusRAG from './components/NexusRAG';
import { ToastProvider } from './components/Toasts';

export default function App() {
  return (
    <ToastProvider>
      <NexusRAG />
    </ToastProvider>
  );
}
