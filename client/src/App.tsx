import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import AuthPage from "./pages/auth-page";
import HomePage from "./pages/home-page";
import NotesPage from "./pages/notes-page";
import GalleryPage from "./pages/gallery-page";
import NotFound from "./pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => React.JSX.Element }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Caricamento...</div>;
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return <Component />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/" component={() => (
            <ProtectedRoute component={HomePage} />
          )} />
          <Route path="/notes" component={() => (
            <ProtectedRoute component={NotesPage} />
          )} />
          <Route path="/gallery" component={() => (
            <ProtectedRoute component={GalleryPage} />
          )} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
