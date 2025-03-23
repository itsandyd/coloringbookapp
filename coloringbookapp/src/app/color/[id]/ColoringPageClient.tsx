"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import Konva components with SSR disabled
const KonvaComponents = dynamic(
  () => import("@/components/KonvaComponents"),
  { ssr: false }
);

interface MaskData {
  bbox: number[];
  mask_path: string;
  score: number;
}

interface FillData {
  maskIndex: number;
  color: string;
  x?: number;
  y?: number;
  radius?: number;
}

interface OldFillData {
  x: number;
  y: number;
  color: string;
}

type ImageData = {
  id: number;
  uuid: string;
  prompt: string;
  imageUrl: string;
  masks?: MaskData[];
  createdAt: string;
};

type DrawingData = {
  id: number;
  imageId: string;
  lines: Array<{ points: number[]; stroke: string; strokeWidth: number }>;
  fills: Array<FillData | OldFillData>; // Support both old and new formats
  createdAt: string;
  updatedAt: string;
};

export default function ColoringPageClient({ id }: { id: string }) {
  const router = useRouter();
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [lines, setLines] = useState<Array<{ points: number[]; stroke: string; strokeWidth: number }>>([]);
  const [fills, setFills] = useState<Array<FillData>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#ff0000"); // Red as default
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [mode, setMode] = useState<'draw' | 'fill'>('draw');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // Colors to choose from
  const colors = [
    "#ff0000", // Red
    "#ff9900", // Orange
    "#ffff00", // Yellow
    "#00ff00", // Green
    "#0000ff", // Blue
    "#9900ff", // Purple
    "#ff00ff", // Pink
    "#000000", // Black
    "#ffffff", // White
  ];

  // Load the image data and drawing from the database
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      
      try {
        // Fetch the image data
        console.log("Fetching image with UUID:", id);
        const imageResponse = await fetch(`/api/images?uuid=${id}`);
        
        if (!imageResponse.ok) {
          if (imageResponse.status === 404) {
            setError("Image not found. It may have been deleted or never created.");
          } else {
            throw new Error('Failed to fetch image data');
          }
          setLoading(false);
          return;
        }
        
        const imageData: ImageData = await imageResponse.json();
        console.log("Received image data:", imageData);
        
        if (!imageData.imageUrl) {
          setError("Image URL is missing. Cannot display the coloring page.");
          setLoading(false);
          return;
        }
        
        setImageData(imageData);
        
        // If no masks are available, trigger the segmentation process
        // Segmentation disabled - caused errors with the Replicate API
        /*
        if (!imageData.masks && !processingMasks) {
          setProcessingMasks(true);
          console.log("No masks found, triggering segmentation process...");
          
          try {
            // Call the segment API to process the image
            await fetch('/api/segment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageUrl: imageData.imageUrl,
                imageId: imageData.uuid,
              }),
            });
            
            // Fetch the updated image data with masks
            const updatedImageResponse = await fetch(`/api/images?uuid=${id}`);
            if (updatedImageResponse.ok) {
              const updatedImageData = await updatedImageResponse.json();
              setImageData(updatedImageData);
            }
          } catch (segmentError) {
            console.error('Error segmenting image:', segmentError);
            // Continue even if segmentation fails
          } finally {
            setProcessingMasks(false);
          }
        }
        */
        
        // Fetch any saved drawing for this image
        try {
          const drawingResponse = await fetch(`/api/drawings?imageId=${imageData.uuid}`);
          
          if (drawingResponse.ok) {
            const drawingData: DrawingData = await drawingResponse.json();
            setLines(drawingData.lines);
            if (drawingData.fills) {
              // Convert old fill format to new format if needed
              const convertedFills: FillData[] = drawingData.fills.map(fill => {
                // If it's already in the new format with maskIndex
                if ('maskIndex' in fill) {
                  return fill as FillData;
                }
                // Convert from old format (x, y, color) to new format (maskIndex, color, x, y)
                return {
                  maskIndex: -1, // Use -1 for fills that don't use masks
                  color: fill.color,
                  x: fill.x,
                  y: fill.y
                };
              });
              setFills(convertedFills);
            }
          }
        } catch (drawingError) {
          console.error('Error loading drawing:', drawingError);
          // Continue even if drawing can't be loaded
        }
        
        // Load the image
        const img = new window.Image();
        img.crossOrigin = "Anonymous"; // Allow loading cross-origin images
        img.src = imageData.imageUrl;
        
        console.log("Loading image from URL:", imageData.imageUrl);
        
        img.onload = () => {
          console.log("Image loaded successfully");
          setImageObj(img);
          setLoading(false);
        };
        
        img.onerror = (e) => {
          console.error("Error loading image:", e);
          setError("Failed to load image. Try again or generate a new one.");
          setLoading(false);
        };
      } catch (error) {
        console.error("Error loading data:", error);
        setError("An error occurred while loading the image.");
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);
  
  // Save the drawing to the database when lines or fills change
  useEffect(() => {
    // Debounce the save operation
    const saveTimer = setTimeout(async () => {
      if ((lines.length > 0 || fills.length > 0) && imageData?.uuid) {
        try {
          setSaveStatus("Saving...");
          
          await fetch('/api/drawings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              imageId: imageData.uuid,
              lines,
              fills,
            }),
          });
          
          setSaveStatus("Saved");
          
          // Clear the save status after a delay
          setTimeout(() => setSaveStatus(""), 2000);
        } catch (error) {
          console.error('Error saving drawing:', error);
          setSaveStatus("Save failed");
          
          // Clear the save status after a delay
          setTimeout(() => setSaveStatus(""), 3000);
        }
      }
    }, 1000); // Wait 1 second after the last change before saving
    
    return () => clearTimeout(saveTimer);
  }, [lines, fills, imageData?.uuid]);

  const clearCanvas = () => {
    setLines([]);
    setFills([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gray-900 text-gray-100">
      <header className="w-full max-w-4xl mb-4">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => router.push('/')}
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            ← Back to Gallery
          </button>
          <h1 className="text-2xl font-bold text-purple-400">
            {imageData?.prompt ? `Coloring: ${imageData.prompt}` : `Coloring Page #${id}`}
          </h1>
        </div>
      </header>
      
      <main className="w-full max-w-4xl flex-1 flex flex-col items-center gap-6">
        {error && (
          <div className="w-full bg-red-900 border border-red-700 text-red-100 p-4 rounded-md">
            <p>{error}</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-2 underline text-red-300 hover:text-red-200"
            >
              Return to gallery
            </button>
          </div>
        )}
        
        {saveStatus && (
          <div className="fixed top-4 right-4 bg-purple-900 bg-opacity-90 text-white px-4 py-2 rounded-md text-sm">
            {saveStatus}
          </div>
        )}

        <div className="w-full flex flex-col gap-4 items-center">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setMode('draw')}
              className={`px-4 py-2 rounded-md ${
                mode === 'draw' 
                  ? 'bg-purple-700 text-white' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => setMode('fill')}
              className={`px-4 py-2 rounded-md ${
                mode === 'fill' 
                  ? 'bg-purple-700 text-white' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              Fill
            </button>
          </div>
        
          <div className="w-full flex flex-wrap justify-center gap-2 mb-4">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-10 h-10 rounded-full ${
                  currentColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-purple-400' : ''
                }`}
                style={{ backgroundColor: color, border: color === '#ffffff' ? '1px solid #444' : 'none' }}
                aria-label={`Color: ${color}`}
              />
            ))}
            
            <select 
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="ml-4 p-2 border border-gray-700 rounded bg-gray-800 text-gray-200"
            >
              <option value="2">Thin</option>
              <option value="5">Medium</option>
              <option value="10">Thick</option>
            </select>
          </div>
        </div>
        
        <div className="border border-gray-700 rounded-lg shadow-md bg-gray-800 overflow-hidden">
          {loading ? (
            <div className="w-[600px] h-[600px] flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Loading your coloring page...</p>
              </div>
            </div>
          ) : (
            <Suspense fallback={<div className="w-[600px] h-[600px] flex items-center justify-center bg-gray-800">Loading canvas...</div>}>
              {imageObj && (
                <KonvaComponents 
                  imageObj={imageObj} 
                  lines={lines} 
                  setLines={setLines}
                  fills={fills}
                  setFills={setFills}
                  isDrawing={isDrawing}
                  setIsDrawing={setIsDrawing}
                  currentColor={currentColor}
                  strokeWidth={strokeWidth}
                  mode={mode}
                  masks={imageData?.masks}
                />
              )}
            </Suspense>
          )}
        </div>
        
        <div className="flex gap-4 mt-4">
          <button
            onClick={clearCanvas}
            className="bg-red-800 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 disabled:bg-red-900 disabled:text-gray-400"
            disabled={loading || lines.length === 0}
          >
            Clear
          </button>
          <button
            onClick={() => {
              if (window.konvaStageRef) {
                const dataURL = window.konvaStageRef.toDataURL();
                const link = document.createElement('a');
                link.download = `coloring-page-${id}.png`;
                link.href = dataURL;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
            className="bg-purple-700 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-600 disabled:bg-purple-900 disabled:text-gray-400"
            disabled={loading || !imageObj}
          >
            Download
          </button>
        </div>
      </main>
    </div>
  );
} 