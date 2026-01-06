# Plan: Agregar busqueda, filtros y fecha de creacion en lista de usuarios

## Resumen
Agregar funcionalidad de busqueda por nombre/email, filtro por rol y mostrar la fecha de creacion de cada usuario en la tabla del equipo.

## Cambios Requeridos

### 1. Modificar Edge Function `list-team-members`
**Archivo:** `supabase/functions/list-team-members/index.ts`

Actualizar la funcion para incluir la fecha de creacion del usuario:

```typescript
// En la parte donde se combinan los datos (linea 87-97)
const teamMembers = rolesData.map((roleItem) => {
  const profile = profilesData?.find((p) => p.id === roleItem.user_id);
  const authUser = users.find((u) => u.id === roleItem.user_id);
  
  return {
    id: roleItem.user_id,
    email: authUser?.email || "",
    fullName: profile?.full_name || "Sin nombre",
    role: roleItem.role,
    createdAt: authUser?.created_at || null, // NUEVO: fecha de creacion
  };
});
```

### 2. Actualizar el componente `AdminUsuarios.tsx`
**Archivo:** `src/pages/AdminUsuarios.tsx`

#### 2.1 Actualizar la interfaz TeamMember
```typescript
interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string | null; // NUEVO
}
```

#### 2.2 Agregar estados para busqueda y filtro
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "staff">("all");
```

#### 2.3 Agregar logica de filtrado
```typescript
const filteredMembers = useMemo(() => {
  return teamMembers.filter((member) => {
    // Filtro por busqueda (nombre o email)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      member.fullName.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower);
    
    // Filtro por rol
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
}, [teamMembers, searchQuery, roleFilter]);
```

#### 2.4 Agregar UI de busqueda y filtros
Agregar encima de la tabla:
```tsx
<div className="flex flex-col sm:flex-row gap-3 mb-4">
  {/* Campo de busqueda */}
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Buscar por nombre o email..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-9"
    />
  </div>
  
  {/* Filtro por rol */}
  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | "admin" | "staff")}>
    <SelectTrigger className="w-full sm:w-[150px]">
      <SelectValue placeholder="Filtrar por rol" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos los roles</SelectItem>
      <SelectItem value="admin">Administradores</SelectItem>
      <SelectItem value="staff">Staff</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### 2.5 Agregar columna de fecha de creacion en la tabla
```tsx
<TableHeader>
  <TableRow>
    <TableHead>Nombre</TableHead>
    <TableHead>Email</TableHead>
    <TableHead>Creado</TableHead> {/* NUEVA COLUMNA */}
    <TableHead>Rol</TableHead>
    <TableHead className="text-right">Acciones</TableHead>
  </TableRow>
</TableHeader>

// En cada fila:
<TableCell className="text-muted-foreground text-sm">
  {member.createdAt 
    ? format(new Date(member.createdAt), "dd MMM yyyy", { locale: es })
    : "—"
  }
</TableCell>
```

#### 2.6 Agregar imports necesarios
```typescript
import { useMemo } from "react";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
```

#### 2.7 Mostrar mensaje cuando no hay resultados
```tsx
{filteredMembers.length === 0 && teamMembers.length > 0 ? (
  <p className="text-muted-foreground text-center py-8">
    No se encontraron usuarios con los filtros aplicados
  </p>
) : filteredMembers.length === 0 ? (
  <p className="text-muted-foreground text-center py-8">
    No hay usuarios registrados
  </p>
) : (
  <Table>...</Table>
)}
```

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `supabase/functions/list-team-members/index.ts` | Agregar campo `createdAt` en la respuesta |
| `src/pages/AdminUsuarios.tsx` | Agregar busqueda, filtros y columna de fecha |

## Resultado Esperado

1. Campo de busqueda que filtra por nombre o email en tiempo real
2. Selector de filtro por rol (Todos, Administradores, Staff)
3. Nueva columna "Creado" que muestra la fecha de registro formateada
4. Mensaje apropiado cuando no hay resultados con los filtros aplicados

## Notas Tecnicas

- Se usa `useMemo` para optimizar el filtrado y evitar recalculos innecesarios
- La busqueda es case-insensitive
- Se usa `date-fns` (ya instalado) para formatear fechas en espanol
- La fecha viene de `auth.users.created_at` que ya se obtiene via `admin.listUsers()`
