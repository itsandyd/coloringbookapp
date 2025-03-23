import { Suspense } from "react";
import ColoringPageClient from "./ColoringPageClient";


// Server component that passes the id to the client component
export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gray-900 text-gray-100">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-300">Loading your coloring page...</p>
    </div>}>
      <ColoringPageClient id={params.id} />
    </Suspense>
  );
} 