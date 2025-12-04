import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import NuevaReservacion from "./pages/NuevaReservacion";
import EditarReservacion from "./pages/EditarReservacion";
import Bloqueos from "./pages/Bloqueos";
import ListaReservaciones from "./pages/ListaReservaciones";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/nueva" element={<NuevaReservacion />} />
            <Route path="/editar/:id" element={<EditarReservacion />} />
            <Route path="/bloqueos" element={<Bloqueos />} />
            <Route path="/lista" element={<ListaReservaciones />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
