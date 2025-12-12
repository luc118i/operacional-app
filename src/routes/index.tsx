import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/Home/HomePage";
import { CreateSchemePage } from "@/pages/SchemeCreate/CreateSchemePage";
import { SchemeDetailPage } from "@/pages/SchemeDetail/SchemeDetailPage";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateSchemePage />} />
        <Route path="/scheme/:id" element={<SchemeDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
