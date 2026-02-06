import MapComponent from "@/components/Map";
import ChatInterface from "@/components/ChatInterface";
import { LayoutProvider } from "@/context/LayoutContext";
import LeftSidebar from "@/components/LeftSidebar";
import MainLayout from "@/components/MainLayout";

export default function Home() {
  return (
    <LayoutProvider>
      <MainLayout />
    </LayoutProvider>
  );
}
