import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Redirect } from "wouter";
import { Loader2, LockKeyhole, Binary } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex bg-black text-white font-mono">
      <div className="flex-1 flex items-center justify-center p-4">
        <Tabs defaultValue="login" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-black">
              LOGIN
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-black">
              REGISTER
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="font-mono text-xl">ACCESSO GNOTE</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="username">USERNAME</Label>
                    <Input
                      id="username"
                      {...loginForm.register("username")}
                      className="font-mono bg-black border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">PASSWORD</Label>
                    <Input
                      id="password"
                      type="password"
                      {...loginForm.register("password")}
                      className="font-mono bg-black border-zinc-700"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-white text-black hover:bg-zinc-200"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Binary className="mr-2 h-4 w-4" />
                    )}
                    INITIALIZE SESSION
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="font-mono text-xl">REGISTRAZIONE GNOTE</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={registerForm.handleSubmit((data) =>
                    registerMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">USERNAME</Label>
                    <Input
                      id="reg-username"
                      {...registerForm.register("username")}
                      className="font-mono bg-black border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">PASSWORD</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      {...registerForm.register("password")}
                      className="font-mono bg-black border-zinc-700"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-white text-black hover:bg-zinc-200"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Binary className="mr-2 h-4 w-4" />
                    )}
                    CREATE NEW USER
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-zinc-900 p-12">
        <div className="max-w-lg space-y-6 text-center">
          <div className="relative">
            <LockKeyhole className="mx-auto h-24 w-24" />
            <div className="absolute inset-0 animate-pulse opacity-50" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter font-mono">
            GNOTE v1.0
          </h1>
          <p className="text-zinc-400 font-mono leading-relaxed">
            CRITTOGRAFIA MILITARE // AES-256<br />
            CRIPTAZIONE LATO CLIENT<br />
            ARCHITETTURA ZERO-KNOWLEDGE
          </p>
        </div>
      </div>
    </div>
  );
}