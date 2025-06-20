import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, error } = useAuth();
  
  if (error) {
    return <Redirect to="/auth" />;
  }

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user || !user.id) {
    queryClient.setQueryData(["user"], null);
    return (
      <Route path={path}>
        <Redirect to="/auth?redirect=${encodeURIComponent(path)}" />
      </Route>
    );
  }

  return <Component />
}
