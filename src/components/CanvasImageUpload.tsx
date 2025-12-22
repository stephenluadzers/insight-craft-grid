import { useState, useCallback } from "react";
import { Image, X, Upload, Maximize2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface CanvasImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  caption?: string;
}

interface CanvasImageUploadProps {
  images: CanvasImage[];
  onImagesChange: (images: CanvasImage[]) => void;
  panOffset: { x: number; y: number };
}

export const CanvasImageUpload = ({
  images,
  onImagesChange,
  panOffset,
}: CanvasImageUploadProps) => {
  const { toast } = useToast();
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewImage, setPreviewImage] = useState<CanvasImage | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
        }
      }
    },
    [images]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          processImageFile(file, e.clientX, e.clientY);
        }
      }
    },
    [images, panOffset]
  );

  const processImageFile = (file: File, dropX?: number, dropY?: number) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 400;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        
        const newImage: CanvasImage = {
          id: `img-${Date.now()}`,
          url,
          x: dropX ? dropX - panOffset.x - 100 : 150 + images.length * 50,
          y: dropY ? dropY - panOffset.y - 100 : 150 + images.length * 50,
          width: img.width * scale,
          height: img.height * scale,
        };
        
        onImagesChange([...images, newImage]);
        toast({
          title: "Image added",
          description: "Drag to reposition, click to preview",
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleImageMouseDown = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    setDraggedImageId(imageId);
    setDragOffset({
      x: e.clientX - image.x - panOffset.x,
      y: e.clientY - image.y - panOffset.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedImageId) return;

      const x = e.clientX - dragOffset.x - panOffset.x;
      const y = e.clientY - dragOffset.y - panOffset.y;

      onImagesChange(
        images.map((img) =>
          img.id === draggedImageId ? { ...img, x, y } : img
        )
      );
    },
    [draggedImageId, dragOffset, panOffset, images, onImagesChange]
  );

  const handleMouseUp = () => {
    setDraggedImageId(null);
  };

  const handleDeleteImage = (imageId: string) => {
    onImagesChange(images.filter((img) => img.id !== imageId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <>
      {/* Drop zone overlay */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none z-20 transition-all duration-200",
          isDragOver && "bg-primary/10 border-2 border-dashed border-primary pointer-events-auto"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/90 backdrop-blur-sm rounded-xl p-6 shadow-lg flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-primary" />
              <p className="text-lg font-medium">Drop image here</p>
              <p className="text-sm text-muted-foreground">Add visual context to your workflow</p>
            </div>
          </div>
        )}
      </div>

      {/* Rendered images */}
      {images.map((image) => (
        <div
          key={image.id}
          className={cn(
            "absolute group cursor-move rounded-lg overflow-hidden shadow-lg border border-border/50 bg-background/80 backdrop-blur-sm transition-transform",
            draggedImageId === image.id && "ring-2 ring-primary scale-105"
          )}
          style={{
            left: image.x + panOffset.x,
            top: image.y + panOffset.y,
            width: image.width,
            zIndex: draggedImageId === image.id ? 100 : 5,
          }}
          onMouseDown={(e) => handleImageMouseDown(e, image.id)}
        >
          <img
            src={image.url}
            alt={image.caption || "Workflow image"}
            className="w-full h-auto pointer-events-none"
            draggable={false}
          />
          
          {/* Image controls */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(image);
              }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteImage(image.id);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {/* Caption indicator */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5 text-white text-xs">
              <Image className="w-3 h-3" />
              <span>Visual context</span>
            </div>
          </div>
        </div>
      ))}

      {/* Preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <img
              src={previewImage.url}
              alt={previewImage.caption || "Workflow image preview"}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
