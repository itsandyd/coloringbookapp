import { FC } from 'react';

interface KonvaComponentsProps {
  imageObj: HTMLImageElement;
  lines: Array<{ points: number[]; stroke: string; strokeWidth: number }>;
  setLines: React.Dispatch<React.SetStateAction<Array<{ points: number[]; stroke: string; strokeWidth: number }>>>;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  currentColor: string;
  strokeWidth: number;
}

declare const KonvaComponents: FC<KonvaComponentsProps>;
export default KonvaComponents; 