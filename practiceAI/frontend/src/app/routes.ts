import { createBrowserRouter } from "react-router";
import StudentLayout from "./layouts/StudentLayout";
import AdminLayout from "./layouts/AdminLayout";
import StudentHome from "./pages/student/Home";
import StudentChat from "./pages/student/Chat";
import StudentPractice from "./pages/student/Practice";
import StudentHistory from "./pages/student/History";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminKnowledge from "./pages/admin/Knowledge";
import DocumentChunks from "./pages/admin/DocumentChunks";
import AdminSettings from "./pages/admin/Settings";
import Login from "./pages/Login";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: StudentLayout,
    children: [
      { index: true, Component: StudentHome },
      { path: "chat", Component: StudentChat },
      { path: "practice", Component: StudentPractice },
      { path: "history", Component: StudentHistory },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "knowledge", Component: AdminKnowledge },
      { path: "knowledge/:documentId/chunks", Component: DocumentChunks },
      { path: "settings", Component: AdminSettings },
    ],
  },
]);

