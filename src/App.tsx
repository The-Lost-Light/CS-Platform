import { AuthGate } from "@/auth/AuthGate";
import { AuthProvider } from "@/auth/AuthProvider";
import { WorkSpace } from "@/pages/Workspace";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
        <AuthGate>{(session) => <WorkSpace {...session} />}</AuthGate>
      </div>
    </AuthProvider>
  );
}
