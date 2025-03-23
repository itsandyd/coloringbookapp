"use client";

import { useRef, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Circle, Path, Rect } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";

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

interface KonvaComponentsProps {
  imageObj: HTMLImageElement;
  lines: Array<{ points: number[]; stroke: string; strokeWidth: number }>;
  setLines: React.Dispatch<React.SetStateAction<Array<{ points: number[]; stroke: string; strokeWidth: number }>>>;
  fills: Array<FillData>;
  setFills: React.Dispatch<React.SetStateAction<Array<FillData>>>;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  currentColor: string;
  strokeWidth: number;
  mode: 'draw' | 'fill';
  masks?: MaskData[];
}

// Extend the window interface to include our global stage reference
declare global {
  interface Window {
    konvaStageRef: Konva.Stage | null;
  }
}

const KonvaComponents: React.FC<KonvaComponentsProps> = ({
  imageObj,
  lines,
  setLines,
  fills,
  setFills,
  isDrawing,
  setIsDrawing,
  currentColor,
  strokeWidth,
  mode,
  masks,
}) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  useEffect(() => {
    // Make the stage reference globally available for the download function
    if (stageRef.current) {
      window.konvaStageRef = stageRef.current;
    }

    return () => {
      window.konvaStageRef = null;
    };
  }, [stageRef.current]);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    
    if (mode === 'draw') {
      setIsDrawing(true);
      setLines((prevLines) => [
        ...prevLines,
        { points: [pos.x, pos.y], stroke: currentColor, strokeWidth },
      ]);
    } else if (mode === 'fill') {
      // Perform the fill operation
      performFill(pos.x, pos.y);
    }
  };

  const performFill = (x: number, y: number) => {
    if (!stageRef.current || !imageObj) return;
    
    // Check if we have masks from Segment Anything Model
    if (masks && masks.length > 0) {
      // Find which mask contains this point
      const clickedMaskIndex = findMaskAtPoint(x, y);
      
      if (clickedMaskIndex !== -1) {
        // Add a fill with the mask index and color
        setFills(prevFills => [
          ...prevFills, 
          { maskIndex: clickedMaskIndex, color: currentColor }
        ]);
        
        // Force a redraw
        if (layerRef.current) {
          layerRef.current.batchDraw();
        }
        
        return;
      }
    }
    
    // Since segmentation is disabled, improve the circle fill
    createImprovedCircleFill(x, y);
  };
  
  const findMaskAtPoint = (x: number, y: number): number => {
    if (!masks) return -1;
    
    // Scale coordinates if needed (if the stage size is different from the mask size)
    const scale = 1; // Adjust if needed
    const px = Math.floor(x * scale);
    const py = Math.floor(y * scale);
    
    // Find the mask that contains this point
    // In a real implementation, you'd test if the point is inside each mask
    // For now, just use the bounding box as an approximation
    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i];
      if (mask.bbox) {
        const [x1, y1, x2, y2] = mask.bbox;
        if (px >= x1 && px <= x2 && py >= y1 && py <= y2) {
          return i;
        }
      }
    }
    
    return -1; // No mask found
  };
  
  // Improved circle fill with flood fill-like behavior
  const createImprovedCircleFill = (x: number, y: number) => {
    // Instead of just creating a basic circle, 
    // use a more natural-looking fill that adapts to the drawing area
    
    // Create a fill with size based on the click location
    // Areas near edges of the image get smaller fills to reduce overflow
    const edgeDistance = Math.min(
      x, y, 
      600 - x, 
      600 - y
    );
    
    // Adjust radius based on distance from edges (smaller near edges)
    const radius = Math.min(50, Math.max(20, edgeDistance / 2));
    
    // Create a fill with the adaptive radius
    setFills(prevFills => [
      ...prevFills, 
      { 
        maskIndex: -1, 
        color: currentColor, 
        x, 
        y,
        radius: radius // Add radius to fills that don't use masks
      }
    ]);
    
    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || mode !== 'draw') return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    setLines((prevLines) => {
      const lastLine = prevLines[prevLines.length - 1];
      if (!lastLine) return prevLines;

      // Add point to the last line
      const newLastLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y],
      };

      // Replace the last line with the updated one
      return [...prevLines.slice(0, -1), newLastLine];
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    // Prevent scrolling on touch devices
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    
    if (mode === 'draw') {
      setIsDrawing(true);
      setLines((prevLines) => [
        ...prevLines,
        { points: [pos.x, pos.y], stroke: currentColor, strokeWidth },
      ]);
    } else if (mode === 'fill') {
      performFill(pos.x, pos.y);
    }
  };

  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    // Prevent scrolling on touch devices
    e.evt.preventDefault();
    if (!isDrawing || mode !== 'draw') return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    setLines((prevLines) => {
      const lastLine = prevLines[prevLines.length - 1];
      if (!lastLine) return prevLines;

      // Add point to the last line
      const newLastLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y],
      };

      // Replace the last line with the updated one
      return [...prevLines.slice(0, -1), newLastLine];
    });
  };

  return (
    <Stage
      width={600}
      height={600}
      onMouseDown={handleMouseDown}
      onMousemove={handleMouseMove}
      onMouseup={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      ref={stageRef}
    >
      <Layer ref={layerRef}>
        <KonvaImage image={imageObj} width={600} height={600} />
        
        {/* Render fill areas */}
        {fills.map((fill, i) => {
          // If it's a mask-based fill
          if (fill.maskIndex !== undefined && fill.maskIndex >= 0 && masks && masks[fill.maskIndex]) {
            const mask = masks[fill.maskIndex];
            
            // If the mask has a path, use it for more accurate filling
            if (mask.mask_path) {
              return (
                <Path
                  key={`fill-${i}`}
                  data={mask.mask_path}
                  fill={fill.color}
                  opacity={0.5}
                  globalCompositeOperation="source-over"
                />
              );
            }
            
            // If the mask has a bounding box, use it as fallback
            if (mask.bbox) {
              const [x1, y1, x2, y2] = mask.bbox;
              return (
                <Rect
                  key={`fill-${i}`}
                  x={x1}
                  y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  fill={fill.color}
                  opacity={0.5}
                  globalCompositeOperation="source-over"
                />
              );
            }
          }
          
          // Fallback to circle fill if no mask or invalid mask index
          return (
            <Circle
              key={`fill-${i}`}
              x={fill.x || 0}
              y={fill.y || 0}
              radius={fill.radius || 50}
              fill={fill.color}
              opacity={0.5}
              globalCompositeOperation="source-over"
            />
          );
        })}
        
        {/* Render lines */}
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default KonvaComponents; 