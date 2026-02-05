import MapComponent from "@/components/Map";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-900">
      {/* Map Area */}
      <div className="flex-1 relative">
        <MapComponent />
      </div>

      {/* Living Sidebar */}
      <div className="w-[400px] flex-shrink-0 z-20 shadow-2xl">
        <ChatInterface />
      </div>
    </main>
  );
}
