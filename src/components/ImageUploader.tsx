import { useState } from "react";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onWorkflowGenerated: (nodes: any[]) => void;
}

export const ImageUploader = ({ onWorkflowGenerated }: ImageUploaderProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64 for API
    setIsAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      console.log('Sending image to AI for analysis...');
      
      const { data, error } = await supabase.functions.invoke('analyze-workflow-image', {
        body: { image: base64 }
      });

      if (error) throw error;

      console.log('Workflow generated from image:', data);

      toast({
        title: "Workflow Generated!",
        description: data.insights || "Successfully extracted workflow from image",
      });

      onWorkflowGenerated(data.nodes || []);
      setPreview(null);

    } catch (error: any) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze image",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed top-20 right-6 z-40 animate-fade-in">
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-lg">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Image to Workflow
        </h3>
        
        {preview && (
          <div className="mb-3 relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-48 h-32 object-cover rounded-lg"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => setPreview(null)}
            >
              ✕
            </Button>
          </div>
        )}

        <label htmlFor="image-upload">
          <Button
            disabled={isAnalyzing}
            className={cn(
              "w-full cursor-pointer",
              isAnalyzing && "pointer-events-none"
            )}
            asChild
          >
            <div>
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </>
              )}
            </div>
          </Button>
        </label>
        
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isAnalyzing}
        />
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Upload screenshots, sketches, or diagrams
        </p>
      </div>
    </div>
  );
};
