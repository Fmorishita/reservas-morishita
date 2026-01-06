import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, UserPlus, Shield, Users, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Validation schemas
const emailSchema = z.string().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100);
const nameSchema = z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100);

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string | null;
}

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "staff">("all");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");

  // Filtered members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        member.fullName.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower);
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [teamMembers, searchQuery, roleFilter]);

  // Fetch team members - AdminRoute already verified admin access
  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers();
    }
  }, [user?.id]);

  const fetchTeamMembers = async () => {
    setIsLoadingMembers(true);
    
    const { data, error } = await supabase.functions.invoke("list-team-members");

    if (error) {
      console.error("Error fetching team members:", error);
      setIsLoadingMembers(false);
      return;
    }

    if (data?.members) {
      setTeamMembers(data.members);
    }
    
    setIsLoadingMembers(false);
  };

  const handleUpdateRole = async (userId: string, newRole: "admin" | "staff") => {
    const { data, error } = await supabase.functions.invoke("update-user-role", {
      body: { userId, newRole },
    });

    if (error || data?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: data?.error || error?.message || "Error al cambiar el rol",
      });
      return;
    }

    toast({
      title: "Rol actualizado",
      description: `El rol ha sido cambiado a ${newRole === "admin" ? "Administrador" : "Staff"}`,
    });
    fetchTeamMembers();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { userId },
    });

    if (error || data?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: data?.error || error?.message || "Error al eliminar el usuario",
      });
      return;
    }

    toast({
      title: "Usuario eliminado",
      description: `${userName} ha sido eliminado del sistema`,
    });
    fetchTeamMembers();
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

  // Only show loading while auth is loading - AdminRoute handles admin verification
  if (authLoading || !user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
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
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | "admin" | "staff")}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filtrar por rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay usuarios registrados
                </p>
              ) : filteredMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No se encontraron usuarios con los filtros aplicados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => {
                      const isCurrentUser = member.id === user?.id;
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.fullName}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">(Tú)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {member.createdAt
                              ? format(new Date(member.createdAt), "dd MMM yyyy", { locale: es })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleUpdateRole(member.id, value as "admin" | "staff")}
                              disabled={isCurrentUser}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  disabled={isCurrentUser}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente a{" "}
                                    <strong>{member.fullName}</strong> del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(member.id, member.fullName)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
