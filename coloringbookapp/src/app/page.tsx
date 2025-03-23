"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ImageData = {
  id: number;
  uuid: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
};

export default function Home() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [generatedImages, setGeneratedImages] = useState<ImageData[]>([]);
  
  // Load images from the API on component mount
  useEffect(() => {
    async function fetchImages() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/images');
        
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        
        const data = await response.json();
        setGeneratedImages(data);
      } catch (error) {
        console.error('Error loading images:', error);
        setError('Failed to load images. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchImages();
  }, []);

  const generateImage = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError("");
    
    try {
      // Real API call
      console.log("Generating image with prompt:", prompt);
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      console.log("Received response:", data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }
      
      if (!data.uuid || !data.imageUrl) {
        throw new Error('Invalid response from server - missing data');
      }
      
      // Add the new image to our state immediately
      const newImage = {
        id: -1, // Will be replaced when we refresh
        uuid: data.uuid,
        prompt: data.prompt,
        imageUrl: data.imageUrl,
        createdAt: new Date().toISOString()
      };
      
      setGeneratedImages(prevImages => [newImage, ...prevImages]);
      setPrompt("");
      
      // Redirect to the coloring page using the UUID from the response
      router.push(`/color/${data.uuid}`);
      
      // Refresh the image list to get the database version
      const imagesResponse = await fetch('/api/images');
      if (imagesResponse.ok) {
        const images = await imagesResponse.json();
        setGeneratedImages(images);
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError(err instanceof Error ? err.message : "Failed to generate image. Please try again with a different prompt.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gray-900 text-gray-100">
      <header className="w-full max-w-4xl mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-purple-400">
          AI Coloring Book App
        </h1>
        <p className="text-center text-gray-400 mt-2">
          Generate and color your own unique coloring pages
        </p>
      </header>
      
      <main className="w-full max-w-4xl flex-1 flex flex-col items-center gap-8">
        <section className="w-full bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">Create a New Coloring Page</h2>
          
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">
                Describe what you want to generate
              </label>
              <input
                type="text"
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'a cute cat playing with yarn'"
                className="w-full p-3 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
              />
            </div>
            
            {isGenerating && !error && (
              <div className="p-3 bg-purple-900/30 border border-purple-700 text-purple-100 rounded-md flex items-center">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                <p>Generating your image with AI. This may take 10-15 seconds...</p>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-900 border border-red-700 text-red-100 rounded-md">
                {error}
              </div>
            )}
            
            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt.trim()}
              className="bg-purple-700 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-600 disabled:bg-purple-900 disabled:text-gray-400 transition-colors"
            >
              {isGenerating ? "Generating..." : "Generate Coloring Page"}
            </button>
          </div>
        </section>
        
        <section className="w-full">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">Your Coloring Pages</h2>
          
          {isLoading ? (
            <div className="bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-700">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Loading your coloring pages...</p>
            </div>
          ) : generatedImages.length === 0 ? (
            <div className="bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-400 border border-gray-700">
              No coloring pages yet. Generate your first one above!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {generatedImages.map((image) => (
                <Link key={image.uuid} href={`/color/${image.uuid}`} className="block">
                  <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-700">
                    <div className="aspect-square bg-gray-700 relative">
                      <img 
                        src={image.imageUrl} 
                        alt={image.prompt}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium truncate text-gray-200">{image.prompt}</h3>
                      <p className="text-sm text-gray-400">Click to start coloring</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      
      <footer className="w-full max-w-4xl py-4 mt-8 text-center text-gray-500 text-sm">
        Powered by Next.js and Neon Database
      </footer>
    </div>
  );
}
