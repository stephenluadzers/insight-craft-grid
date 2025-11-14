import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, images, videoUrl, tiktokUrl, documents, websiteUrls, existingWorkflow } = await req.json();
    
    console.log('Combining inputs:', { 
      hasText: !!text, 
      imageCount: images?.length || 0, 
      hasVideo: !!videoUrl,
      hasTikTok: !!tiktokUrl,
      documentCount: documents?.length || 0,
      websiteUrlCount: websiteUrls?.length || 0
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    let mergedContext: Record<string, any> = {};
    let combinedDescription = '';
    let allWorkflowData: any[] = [];

    // Process YouTube video if provided
    if (videoUrl) {
      try {
        const { data: videoData, error: videoError } = await supabaseClient.functions.invoke('analyze-youtube-video', {
          body: { videoUrl, existingWorkflow }
        });

        if (!videoError && videoData) {
          if (videoData.context) {
            mergedContext = { ...mergedContext, ...videoData.context };
          }
          if (videoData.workflows) {
            allWorkflowData.push(...videoData.workflows);
          } else if (videoData.nodes) {
            allWorkflowData.push(videoData);
          }
          combinedDescription += `\nYouTube Video Analysis: ${videoData.insights || videoData.explanation || ''}`;
        }
      } catch (error) {
        console.error('YouTube video analysis failed:', error);
      }
    }

    // Process TikTok video if provided
    if (tiktokUrl) {
      try {
        const { data: tiktokData, error: tiktokError } = await supabaseClient.functions.invoke('analyze-tiktok-video', {
          body: { videoUrl: tiktokUrl, existingWorkflow }
        });

        if (!tiktokError && tiktokData) {
          if (tiktokData.context) {
            mergedContext = { ...mergedContext, ...tiktokData.context };
          }
          if (tiktokData.workflows) {
            allWorkflowData.push(...tiktokData.workflows);
          } else if (tiktokData.nodes) {
            allWorkflowData.push(tiktokData);
          }
          combinedDescription += `\nTikTok Video Analysis: ${tiktokData.insights || tiktokData.explanation || ''}`;
        }
      } catch (error) {
        console.error('TikTok video analysis failed:', error);
      }
    }

    // Process images if provided
    if (images && images.length > 0) {
      try {
        const { data: imageData, error: imageError } = await supabaseClient.functions.invoke('analyze-workflow-image', {
          body: { images, existingWorkflow }
        });

        if (!imageError && imageData) {
          if (imageData.context) {
            mergedContext = { ...mergedContext, ...imageData.context };
          }
          if (imageData.workflows) {
            allWorkflowData.push(...imageData.workflows);
          } else if (imageData.nodes) {
            allWorkflowData.push(imageData);
          }
          combinedDescription += `\nImage Analysis: ${imageData.insights || imageData.explanation || ''}`;
        }
      } catch (error) {
        console.error('Image analysis failed:', error);
      }
    }

    // Process documents if provided
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        try {
          const { data: docData, error: docError } = await supabaseClient.functions.invoke('analyze-workflow-document', {
            body: { 
              documentContent: doc.content,
              documentName: doc.name,
              existingWorkflow 
            }
          });

          if (!docError && docData) {
            if (docData.context) {
              mergedContext = { ...mergedContext, ...docData.context };
            }
            if (docData.workflows) {
              allWorkflowData.push(...docData.workflows);
            } else if (docData.nodes) {
              allWorkflowData.push(docData);
            }
            combinedDescription += `\nDocument Analysis (${doc.name}): ${docData.insights || docData.explanation || ''}`;
          }
        } catch (error) {
          console.error('Document analysis failed:', error);
        }
      }
    }

    // Process website URLs if provided
    if (websiteUrls && websiteUrls.length > 0) {
      for (const url of websiteUrls) {
        try {
          const { data: websiteData, error: websiteError } = await supabaseClient.functions.invoke('analyze-workflow-website', {
            body: { websiteUrl: url, existingWorkflow }
          });

          if (!websiteError && websiteData) {
            if (websiteData.context) {
              mergedContext = { ...mergedContext, ...websiteData.context };
            }
            if (websiteData.workflows) {
              allWorkflowData.push(...websiteData.workflows);
            } else if (websiteData.nodes) {
              allWorkflowData.push(websiteData);
            }
            combinedDescription += `\nWebsite Analysis (${url}): ${websiteData.insights || websiteData.explanation || ''}`;
          }
        } catch (error) {
          console.error('Website analysis failed:', error);
        }
      }
    }

    // Process text description
    if (text) {
      combinedDescription += `\nText Description: ${text}`;
    }

    // Now generate the final workflow with all combined context and insights
    const { data: finalData, error: finalError } = await supabaseClient.functions.invoke('generate-workflow-from-text', {
      body: {
        description: `${combinedDescription}\n\nExtracted Context: ${JSON.stringify(mergedContext)}`,
        existingWorkflow
      }
    });

    if (finalError) throw finalError;

    // Merge context into the final workflow
    if (finalData.workflows) {
      finalData.workflows = finalData.workflows.map((workflow: any) => ({
        ...workflow,
        context: { ...mergedContext, ...(workflow.context || {}) }
      }));
    } else if (finalData.nodes) {
      finalData.context = mergedContext;
    }

    return new Response(
      JSON.stringify({
        ...finalData,
        combinedContext: mergedContext,
        inputSummary: {
          hasText: !!text,
          imageCount: images?.length || 0,
          hasVideo: !!videoUrl,
          documentCount: documents?.length || 0,
          websiteUrlCount: websiteUrls?.length || 0
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error combining inputs:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error combining inputs' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
