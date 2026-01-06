import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import logoImage from "@/assets/morishita-logo.png";

// Validation schemas
const emailSchema = z.string().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100);
const nameSchema = z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100);

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, isLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Email o contraseña incorrectos");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Por favor confirma tu email antes de iniciar sesión");
      } else {
        setError(error.message);
      }
    } else {
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente",
      });
    }
    
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    
    if (error) {
      if (error.message.includes("User already registered")) {
        setError("Este email ya está registrado. Intenta iniciar sesión.");
      } else {
        setError(error.message);
      }
    } else {
      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.",
      });
      // Switch to login tab
      setActiveTab("login");
      setLoginEmail(signupEmail);
      // Clear signup form
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-radial">
        <div className="relative">
          <div className="absolute inset-0 animate-glow rounded-full" />
          <Loader2 className="w-10 h-10 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-radial pattern-japanese relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <Card className="w-full max-w-md shadow-medium border-border/50 backdrop-blur-sm bg-card/95 animate-fade-in-up relative z-10">
        <CardHeader className="text-center space-y-6 pb-2">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gold/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src={logoImage} 
                alt="Morishita" 
                className="h-20 w-auto relative transition-transform duration-500 hover:scale-105" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl md:text-3xl font-medium tracking-tight">
              Morishita
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sistema de gestión de reservas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {error && (
            <Alert variant="destructive" className="mb-6 animate-scale-in">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(""); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-card data-[state=active]:shadow-soft transition-all duration-300"
              >
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-card data-[state=active]:shadow-soft transition-all duration-300"
              >
                Registrarse
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="pl-10 h-12 bg-muted/30 border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="pl-10 pr-10 h-12 bg-muted/30 border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium gradient-gold text-primary-foreground hover:opacity-90 shadow-gold transition-all duration-300 hover:shadow-lg" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Tu nombre"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="pl-10 h-12 bg-muted/30 border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="pl-10 h-12 bg-muted/30 border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="pl-10 pr-10 h-12 bg-muted/30 border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-sm font-medium">Confirmar contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repite tu contraseña"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="pl-10 pr-10 h-12 bg-muted/30 border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium gradient-gold text-primary-foreground hover:opacity-90 shadow-gold transition-all duration-300 hover:shadow-lg" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
