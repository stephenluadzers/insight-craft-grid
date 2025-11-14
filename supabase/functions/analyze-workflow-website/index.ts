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
    const { websiteUrl, existingWorkflow } = await req.json();
    
    console.log('Analyzing website:', { websiteUrl });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch website content
    let websiteContent = '';
    let videoContext = {
      embeddedVideos: [] as string[],
      hasVideos: false,
    };
    
    try {
      const websiteResponse = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RemoraFlow/1.0; +https://remoraflow.com)'
        }
      });
      
      if (!websiteResponse.ok) {
        throw new Error(`Failed to fetch website: ${websiteResponse.status}`);
      }
      
      const html = await websiteResponse.text();
      
      // Extract embedded videos from the HTML
      const videoRegex = /<(?:video|iframe)[^>]*src=["']([^"']+)["'][^>]*>/gi;
      const embeddedVideos: string[] = [];
      let match;
      while ((match = videoRegex.exec(html)) !== null) {
        embeddedVideos.push(match[1]);
      }

      // Also check for common video hosting patterns
      const youtubeEmbeds = html.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/g) || [];
      const vimeoEmbeds = html.match(/player\.vimeo\.com\/video\/(\d+)/g) || [];
      
      videoContext = {
        embeddedVideos: [...embeddedVideos, ...youtubeEmbeds, ...vimeoEmbeds].slice(0, 5), // Limit to 5
        hasVideos: embeddedVideos.length > 0 || youtubeEmbeds.length > 0 || vimeoEmbeds.length > 0,
      };

      console.log('Detected embedded videos:', videoContext);
      
      websiteContent = html
      
      // Extract text content from HTML (simple extraction)
      websiteContent = websiteContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50000); // Limit content size
      
    } catch (error) {
      console.error('Error fetching website:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch website content: ${errorMessage}`);
    }

    const systemPrompt = `You are an AI Workflow Architect analyzing website content to extract workflow structures and patterns.

CRITICAL TASKS:
1. Identify workflow patterns, processes, tutorials, or automation opportunities on the website
2. Extract structured steps, decision points, and logical flows
3. Map website content to workflow nodes and connections
4. ${videoContext.hasVideos ? 'IMPORTANT: This website contains embedded videos (' + videoContext.embeddedVideos.length + ' detected) - consider video content as potential workflow demonstrations' : ''}

OUTPUT FORMAT (JSON):
{
  "workflows": [{
    "name": "Workflow Name",
    "nodes": [...],
    "connections": [...],
    "context": {
      "companyName": "extracted name",
      "productType": "extracted type",
      "hasEmbeddedVideos": ${videoContext.hasVideos},
      "embeddedVideoUrls": ${JSON.stringify(videoContext.embeddedVideos)},
      // any other relevant data fields
    }
  }],
  "insights": "What workflow patterns were found on the website${videoContext.hasVideos ? ' (including video content indicators)' : ''}",
  "explanation": "How the website content maps to automation workflows"
}

Extract all relevant data fields that could be used in workflow automation.
${videoContext.hasVideos ? '\nNOTE: Embedded videos detected - these may contain workflow demonstrations, tutorials, or process walkthroughs.' : ''}`;

    const prompt = existingWorkflow 
      ? `Analyze this website content and enhance the existing workflow with insights from it.\n\nWebsite URL: ${websiteUrl}\nContent:\n${websiteContent}\n\nExisting Workflow: ${JSON.stringify(existingWorkflow)}`
      : `Analyze this website content and extract workflow structures and relevant business context.\n\nWebsite URL: ${websiteUrl}\nContent:\n${websiteContent}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let parsedResult;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedResult = JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      parsedResult = {
        workflows: [],
        insights: content,
        explanation: 'Failed to parse structured workflow data',
        context: {}
      };
    }

    return new Response(
      JSON.stringify(parsedResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error analyzing website:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error analyzing website' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
