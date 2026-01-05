import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { StaffRoute } from "@/components/StaffRoute";
import Index from "./pages/Index";
import NuevaReservacion from "./pages/NuevaReservacion";
import EditarReservacion from "./pages/EditarReservacion";
import Bloqueos from "./pages/Bloqueos";
import ListaReservaciones from "./pages/ListaReservaciones";
import ReservacionDesdeImagen from "./pages/ReservacionDesdeImagen";
import AdminUsuarios from "./pages/AdminUsuarios";
import SetupAdmin from "./pages/SetupAdmin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Main App component with routing
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup" element={<SetupAdmin />} />
          
          {/* Protected routes */}
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Index />} />
            <Route path="/nueva" element={<NuevaReservacion />} />
            <Route path="/desde-imagen" element={<ReservacionDesdeImagen />} />
            <Route path="/editar/:id" element={<EditarReservacion />} />
            <Route
              path="/bloqueos"
              element={
                <StaffRoute>
                  <Bloqueos />
                </StaffRoute>
              }
            />
            <Route path="/lista" element={<ListaReservaciones />} />
            <Route
              path="/admin/usuarios"
              element={
                <AdminRoute>
                  <AdminUsuarios />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
