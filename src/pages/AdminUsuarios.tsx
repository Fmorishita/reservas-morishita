import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, UserPlus, Shield, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Validation schemas
const emailSchema = z.string().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100);
const nameSchema = z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100);

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole(user?.id);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !roleLoading && !isAdmin) {
      navigate("/", { replace: true });
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta página",
      });
    }
  }, [authLoading, roleLoading, isAdmin, navigate]);

  // Fetch team members
  useEffect(() => {
    if (isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin]);

  const fetchTeamMembers = async () => {
    setIsLoadingMembers(true);
    
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      setIsLoadingMembers(false);
      return;
    }

    // Get profiles for these users
    const userIds = rolesData.map(r => r.user_id);
    
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setIsLoadingMembers(false);
      return;
    }

    // Combine the data
    const members: TeamMember[] = rolesData.map(roleItem => {
      const profile = profilesData.find(p => p.id === roleItem.user_id);
      return {
        id: roleItem.user_id,
        email: "", // We don't have email access from profiles
        fullName: profile?.full_name || "Sin nombre",
        role: roleItem.role,
      };
    });

    setTeamMembers(members);
    setIsLoadingMembers(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
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

    const { data: sessionData } = await supabase.auth.getSession();
    
    const response = await supabase.functions.invoke("create-user", {
      body: { email, password, fullName, role },
    });

    if (response.error) {
      setError(response.error.message || "Error al crear usuario");
    } else if (response.data.error) {
      setError(response.data.error);
    } else {
      toast({
        title: "Usuario creado",
        description: `${fullName} ahora puede acceder al sistema`,
      });
      // Reset form
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("staff");
      // Refresh team members
      fetchTeamMembers();
    }

    setIsSubmitting(false);
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Administrar Usuarios
        </h1>
        <p className="text-muted-foreground">
          Crea y administra las cuentas de tu equipo
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Crear Nuevo Usuario
              </CardTitle>
              <CardDescription>
                Agrega un nuevo miembro a tu equipo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Pérez"
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
                    placeholder="juan@morishita.com"
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

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Los administradores pueden crear y eliminar usuarios
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando usuario...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Crear Usuario
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Team Members List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipo
              </CardTitle>
              <CardDescription>
                Miembros con acceso al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay usuarios registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.fullName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                            {member.role === "admin" ? "Admin" : "Staff"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
