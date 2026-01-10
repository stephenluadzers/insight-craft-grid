/**
 * AI TRANSPARENCY & FAIR-USE STATEMENT
 * Remora Development | Remora Flow
 * Version: 2.0 | Enhanced AI Analysis
 * 
 * Enhanced YouTube video analysis with AI-powered content understanding,
 * step extraction, and intelligent workflow generation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch video transcript using YouTube's timedtext API with multiple fallbacks
async function fetchTranscript(videoId: string): Promise<{ transcript: string; language: string }> {
  try {
    console.log('Fetching transcript for video:', videoId);
    
    // Fetch the video page
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!videoPageResponse.ok) {
      console.log('Failed to fetch video page:', videoPageResponse.status);
      return { transcript: '', language: '' };
    }
    
    const videoPageText = await videoPageResponse.text();
    
    // Try multiple patterns to find caption tracks
    let captionTracks = null;
    
    // Pattern 1: Standard captionTracks format
    const captionMatch = videoPageText.match(/"captionTracks":\s*(\[.*?\])/);
    if (captionMatch) {
      try {
        captionTracks = JSON.parse(captionMatch[1]);
      } catch (e) {
        console.log('Failed to parse captionTracks pattern 1');
      }
    }
    
    // Pattern 2: Alternative format
    if (!captionTracks) {
      const altMatch = videoPageText.match(/\\"captionTracks\\":\s*(\[.*?\])/);
      if (altMatch) {
        try {
          captionTracks = JSON.parse(altMatch[1].replace(/\\"/g, '"'));
        } catch (e) {
          console.log('Failed to parse captionTracks pattern 2');
        }
      }
    }
    
    // Pattern 3: playerCaptionsTracklistRenderer
    if (!captionTracks) {
      const rendererMatch = videoPageText.match(/"playerCaptionsTracklistRenderer":\s*\{[^}]*"captionTracks":\s*(\[.*?\])/);
      if (rendererMatch) {
        try {
          captionTracks = JSON.parse(rendererMatch[1]);
        } catch (e) {
          console.log('Failed to parse captionTracks pattern 3');
        }
      }
    }
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found for video');
      return { transcript: '', language: '' };
    }
    
    console.log('Found caption tracks:', captionTracks.length);
    
    // Priority: English > English (auto-generated) > any language
    const englishTrack = captionTracks.find((t: any) => 
      t.languageCode === 'en' && !t.kind
    );
    const autoEnglishTrack = captionTracks.find((t: any) => 
      t.languageCode === 'en' && t.kind === 'asr'
    );
    const anyTrack = captionTracks[0];
    
    const selectedTrack = englishTrack || autoEnglishTrack || anyTrack;
    const captionUrl = selectedTrack.baseUrl;
    const language = selectedTrack.languageCode || 'unknown';
    
    console.log('Using caption track:', language, selectedTrack.kind || 'manual');
    
    // Fetch the captions
    const captionResponse = await fetch(captionUrl);
    if (!captionResponse.ok) {
      console.log('Failed to fetch captions:', captionResponse.status);
      return { transcript: '', language };
    }
    
    const captionXml = await captionResponse.text();
    
    // Parse XML and extract text with timestamps for context
    const textMatches = captionXml.matchAll(/<text[^>]*start="([^"]*)"[^>]*>(.*?)<\/text>/g);
    const segments = Array.from(textMatches).map(match => ({
      time: parseFloat(match[1]),
      text: match[2]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '') // Remove any HTML tags
        .trim()
    })).filter(s => s.text.length > 0);
    
    // Join segments with proper spacing
    const transcript = segments.map(s => s.text).join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Extracted transcript length:', transcript.length);
    return { transcript, language };
    
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return { transcript: '', language: '' };
  }
}

// Fetch comprehensive video metadata
async function fetchMetadata(videoId: string) {
  try {
    // oEmbed for basic info
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!oembedResponse.ok) {
      console.log('oEmbed failed, trying fallback');
      return null;
    }
    
    const oembed = await oembedResponse.json();
    
    return {
      title: oembed.title || '',
      author: oembed.author_name || '',
      thumbnail: oembed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      provider: 'YouTube'
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

// AI-powered content analysis for better workflow extraction
async function analyzeContentWithAI(
  transcript: string, 
  title: string, 
  author: string,
  apiKey: string
): Promise<{
  summary: string;
  steps: Array<{ step: number; title: string; description: string; type: string }>;
  workflowType: string;
  complexity: string;
  integrations: string[];
  nodeTypes: string[];
}> {
  try {
    console.log('Starting AI content analysis...');
    
    // Limit transcript for API
    const truncatedTranscript = transcript.slice(0, 15000);
    
    const systemPrompt = `You are an expert at analyzing YouTube video content and extracting actionable workflow steps.

Your task is to analyze the video transcript and extract:
1. A clear summary of what the video teaches/shows
2. Step-by-step process or workflow that could be automated
3. What type of workflow this represents (automation, tutorial, process, integration)
4. What tools/integrations are mentioned or needed
5. The appropriate node types for building this workflow

Focus on ACTIONABLE steps that can become workflow nodes. Each step should represent a discrete action.

Node types available:
- trigger: Starting point (webhook, schedule, manual, event)
- action: Performs an operation
- condition: Decision/branching logic
- data: Data transformation/storage
- ai: AI/ML operations
- connector: External service integration (API calls)
- error_handler: Error handling
- utility: Helper operations (delay, loop, etc.)`;

    const userPrompt = `Analyze this YouTube video and extract a workflow:

VIDEO TITLE: "${title}"
CHANNEL: ${author}

TRANSCRIPT:
${truncatedTranscript}

Extract the workflow steps that could be automated. Return a JSON object with:
- summary: Brief description of the video content (2-3 sentences)
- steps: Array of extracted steps, each with { step, title, description, type }
- workflowType: Category (automation, tutorial, integration, process, data-pipeline)
- complexity: simple, medium, or complex
- integrations: List of tools/services mentioned
- nodeTypes: List of recommended node types for this workflow`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 4096,
        temperature: 0.3,
        tools: [{
          type: 'function',
          function: {
            name: 'extract_workflow',
            description: 'Extract workflow structure from video content',
            parameters: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: 'Video summary' },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      step: { type: 'number' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      type: { type: 'string', enum: ['trigger', 'action', 'condition', 'data', 'ai', 'connector', 'error_handler', 'utility'] }
                    },
                    required: ['step', 'title', 'description', 'type']
                  }
                },
                workflowType: { type: 'string' },
                complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
                integrations: { type: 'array', items: { type: 'string' } },
                nodeTypes: { type: 'array', items: { type: 'string' } }
              },
              required: ['summary', 'steps', 'workflowType', 'complexity', 'integrations', 'nodeTypes']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_workflow' } },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse tool call response
    const toolArgs = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (typeof toolArgs === 'string') {
      const parsed = JSON.parse(toolArgs);
      console.log('AI analysis complete. Steps extracted:', parsed.steps?.length);
      return parsed;
    }
    
    throw new Error('Invalid AI response format');
    
  } catch (error) {
    console.error('AI analysis error:', error);
    // Return a fallback structure
    return {
      summary: `Video "${title}" by ${author}`,
      steps: [],
      workflowType: 'unknown',
      complexity: 'medium',
      integrations: [],
      nodeTypes: ['trigger', 'action']
    };
  }
}

// Generate workflow nodes from AI analysis
function generateWorkflowFromAnalysis(
  analysis: {
    summary: string;
    steps: Array<{ step: number; title: string; description: string; type: string }>;
    workflowType: string;
    complexity: string;
    integrations: string[];
    nodeTypes: string[];
  },
  videoTitle: string,
  videoId: string
): { nodes: any[]; connections: any[] } {
  const nodes: any[] = [];
  const connections: any[] = [];
  
  // Start with a trigger node
  const triggerId = `trigger_${Date.now()}`;
  nodes.push({
    id: triggerId,
    type: 'trigger',
    title: 'Start Workflow',
    description: `Workflow based on: ${videoTitle}`,
    x: 100,
    y: 250,
    config: {
      trigger_type: 'manual',
      source: 'youtube_video',
      videoId: videoId
    }
  });
  
  let prevNodeId = triggerId;
  
  // Add nodes for each step
  analysis.steps.forEach((step, index) => {
    const nodeId = `node_${Date.now()}_${index}`;
    const xPos = 350 + (index * 250);
    const yPos = 250 + (index % 2 === 0 ? 0 : 80); // Slight stagger for readability
    
    nodes.push({
      id: nodeId,
      type: step.type || 'action',
      title: step.title.slice(0, 30), // Limit title length
      description: step.description,
      x: xPos,
      y: yPos,
      config: {
        stepNumber: step.step,
        originalType: step.type
      }
    });
    
    // Connect to previous node
    connections.push({
      from: prevNodeId,
      to: nodeId
    });
    
    prevNodeId = nodeId;
  });
  
  // Add an output/end node
  if (nodes.length > 1) {
    const outputId = `output_${Date.now()}`;
    nodes.push({
      id: outputId,
      type: 'action',
      title: 'Complete',
      description: 'Workflow execution completed',
      x: 350 + (analysis.steps.length * 250),
      y: 250,
      config: {
        action_type: 'output',
        status: 'success'
      }
    });
    
    connections.push({
      from: prevNodeId,
      to: outputId
    });
  }
  
  return { nodes, connections };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const url = body.url || body.videoUrl;

    if (!url) {
      throw new Error('YouTube URL is required (pass as "url" or "videoUrl")');
    }

    console.log('=== Enhanced YouTube Analysis Started ===');
    console.log('Processing URL:', url);
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    console.log('Video ID:', videoId);

    // Fetch data in parallel
    const [transcriptResult, metadata] = await Promise.all([
      fetchTranscript(videoId),
      fetchMetadata(videoId)
    ]);

    const { transcript, language } = transcriptResult;
    console.log('Metadata:', metadata?.title);
    console.log('Transcript:', transcript.length, 'chars, language:', language);

    if (!transcript && !metadata) {
      throw new Error('Could not extract any data from the video. It may be private, age-restricted, or have no captions.');
    }

    const videoTitle = metadata?.title || 'Unknown Video';
    const videoAuthor = metadata?.author || 'Unknown';

    // Get AI analysis if we have transcript
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiAnalysis = null;
    let generatedWorkflow = null;

    if (transcript && LOVABLE_API_KEY) {
      console.log('Performing AI content analysis...');
      aiAnalysis = await analyzeContentWithAI(transcript, videoTitle, videoAuthor, LOVABLE_API_KEY);
      
      // Generate workflow nodes from analysis
      if (aiAnalysis.steps.length > 0) {
        generatedWorkflow = generateWorkflowFromAnalysis(aiAnalysis, videoTitle, videoId);
        console.log('Generated workflow with', generatedWorkflow.nodes.length, 'nodes');
      }
    }

    // Build comprehensive workflow description for the generate function
    const workflowDescription = aiAnalysis 
      ? `
VIDEO WORKFLOW: ${videoTitle}
Author: ${videoAuthor}
Type: ${aiAnalysis.workflowType} | Complexity: ${aiAnalysis.complexity}

SUMMARY:
${aiAnalysis.summary}

WORKFLOW STEPS:
${aiAnalysis.steps.map(s => `${s.step}. [${s.type.toUpperCase()}] ${s.title}: ${s.description}`).join('\n')}

INTEGRATIONS DETECTED: ${aiAnalysis.integrations.join(', ') || 'None specified'}
RECOMMENDED NODE TYPES: ${aiAnalysis.nodeTypes.join(', ')}
      `.trim()
      : `
VIDEO: "${videoTitle}" by ${videoAuthor}
Video ID: ${videoId}

TRANSCRIPT EXCERPT:
${transcript ? transcript.slice(0, 4000) : 'No transcript available'}

Create a workflow that captures the key steps or concepts from this video.
      `.trim();

    const response = {
      videoId,
      title: videoTitle,
      author: videoAuthor,
      thumbnail: metadata?.thumbnail,
      language,
      
      // Transcript data
      transcript: transcript || null,
      transcriptLength: transcript.length,
      hasTranscript: !!transcript,
      
      // AI Analysis results
      analysis: aiAnalysis ? {
        summary: aiAnalysis.summary,
        workflowType: aiAnalysis.workflowType,
        complexity: aiAnalysis.complexity,
        stepsExtracted: aiAnalysis.steps.length,
        integrations: aiAnalysis.integrations,
        nodeTypes: aiAnalysis.nodeTypes,
        steps: aiAnalysis.steps
      } : null,
      
      // Pre-generated workflow
      workflow: generatedWorkflow,
      
      // For combine-workflow-inputs compatibility
      description: workflowDescription,
      insights: aiAnalysis 
        ? `Analyzed "${videoTitle}" - Extracted ${aiAnalysis.steps.length} workflow steps (${aiAnalysis.complexity} ${aiAnalysis.workflowType})`
        : `Analyzed "${videoTitle}" - ${transcript.length > 0 ? 'transcript extracted' : 'metadata only'}`,
      
      context: {
        videoTitle,
        videoAuthor,
        videoId,
        hasTranscript: !!transcript,
        hasAIAnalysis: !!aiAnalysis,
        contentType: 'youtube_video',
        workflowType: aiAnalysis?.workflowType || 'unknown',
        complexity: aiAnalysis?.complexity || 'unknown'
      }
    };

    console.log('=== YouTube Analysis Complete ===');
    console.log('Steps extracted:', aiAnalysis?.steps.length || 0);
    console.log('Workflow nodes generated:', generatedWorkflow?.nodes.length || 0);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-youtube-video:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
