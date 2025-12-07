import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FormBuilder from "./pages/FormBuilder";
import FormViewer from "./pages/FormViewer";
import Responses from "./pages/Responses";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/form-builder" element={<FormBuilder />} />
      <Route path="/form-builder/:formId" element={<FormBuilder />} />
      <Route path="/public/form/:formId" element={<FormViewer />} />
      <Route path="/forms/:formId/responses" element={<Responses />} />
      <Route path="*" element={<div>Not found</div>} />
    </Routes>
  );
}

export default App;
