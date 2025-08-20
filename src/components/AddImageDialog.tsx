"use client";

import { useState } from "react";
import { fabric } from "fabric";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Canvas } from "fabric/fabric-impl";

// If getCurrentCanvas and setActiveTool live in CanvasNotebook, you can pass them as props
export function AddImageDialog({ 
  open, 
  onOpenChange, 
  getCurrentCanvas, 
  setActiveTool 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getCurrentCanvas: () => Canvas | null;
  setActiveTool: (tool: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState("");

  const addImageToCanvas = (url: string) => {
    const canvas = getCurrentCanvas();
    if (!canvas) return;

    fabric.Image.fromURL(
      url,
      (img) => {
        const maxWidth = (canvas.width || 0) * 0.8;
        const maxHeight = (canvas.height || 0) * 0.8;
        const scale = Math.min(maxWidth / (img.width || 1), maxHeight / (img.height || 1));

        // Remove 'erasable' property which doesn't exist in fabric.Image
        img.set({
          left: 100,
          top: 50,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          hasControls: true,
          cornerStyle: "circle",
          transparentCorners: false,
        } as fabric.IImageOptions);

        canvas.add(img);
        canvas.setActiveObject(img);
        setActiveTool("image");
        canvas.renderAll();
      },
      { crossOrigin: "anonymous" }
    );
  };

  const handleAddFromURL = () => {
    if (imageUrl.trim() !== "") {
      addImageToCanvas(imageUrl.trim());
      setImageUrl("");
      onOpenChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        addImageToCanvas(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-lg text-gray-100 max-w-sm"
>
  <DialogHeader>
    <DialogTitle className="text-sm font-medium text-gray-300">
      Add Image
    </DialogTitle>
  </DialogHeader>

  <div className="space-y-3">
    <Input
      className="bg-[#2a2a2a] border border-[#3a3a3a] text-gray-100 placeholder-gray-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500"
      placeholder="Paste image link..."
      value={imageUrl}
      onChange={(e) => setImageUrl(e.target.value)}
    />

    <div className="flex items-center justify-center gap-2">
      <span className="text-gray-600 text-xs">or</span>
    </div>

    <Button
      variant="outline"
      className="w-full border border-[#3a3a3a] bg-[#2a2a2a] text-gray-200 hover:bg-[#333] hover:border-[#4a4a4a] transition-colors"
      onClick={() => document.getElementById("fileInput")?.click()}
    >
      Upload from device
    </Button>
    <input
      id="fileInput"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileChange}
    />
  </div>

  <DialogFooter>
    <Button
      className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
      onClick={handleAddFromURL}
      disabled={!imageUrl.trim()}
    >
      Add from URL
    </Button>
  </DialogFooter>
</DialogContent>

    </Dialog>
  );
}
