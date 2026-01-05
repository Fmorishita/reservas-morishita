import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Shield, CheckCircle } from "lucide-react";
import logoImage from "@/assets/morishita-logo.png";

// Validation schemas
const emailSchema = z.string().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100);
const nameSchema = z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100);

export default function SetupAdmin() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Check if admin already exists
  useEffect(() => {
    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasAdmin(true);
      }
      setIsCheckingAdmin(false);
    };
    checkAdmin();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    try {
      nameSchema.parse(fullName);
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);

    const response = await supabase.functions.invoke("setup-admin", {
      body: { email, password, fullName },
    });

    if (response.error) {
      setError(response.error.message || "Error al crear administrador");
    } else if (response.data.error) {
      setError(response.data.error);
    } else {
      setSuccess(true);
    }

    setIsSubmitting(false);
  };

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logoImage} alt="Morishita" className="h-16 w-auto" />
            </div>
            <div>
              <CardTitle className="text-2xl">Sistema ya configurado</CardTitle>
              <CardDescription>
                Ya existe un administrador en el sistema
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/auth")} className="w-full">
              Ir a Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">¡Listo!</CardTitle>
              <CardDescription>
                Administrador creado exitosamente
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Ya puedes iniciar sesión con tu cuenta de administrador
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Ir a Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoImage} alt="Morishita" className="h-16 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              Configuración Inicial
            </CardTitle>
            <CardDescription>
              Crea la primera cuenta de administrador
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Tu Nombre</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Tu nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando administrador...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Crear Administrador
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
