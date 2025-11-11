import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { injectGuardrailNodes, GUARDRAIL_SYSTEM_PROMPT } from "../_shared/guardrails.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received image analysis request');
    
    const { images, image, existingWorkflow } = await req.json();
    
    // Support both single image (legacy) and multiple images
    const imageArray = images || (image ? [image] : []);
    
    // Input validation
    if (!imageArray || imageArray.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(imageArray)) {
      return new Response(
        JSON.stringify({ error: 'Images must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (imageArray.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum 5 images allowed per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each image
    for (let i = 0; i < imageArray.length; i++) {
      const img = imageArray[i];
      
      if (typeof img !== 'string') {
        return new Response(
          JSON.stringify({ error: `Image ${i + 1} must be a string (base64 or URL)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check image size for base64 images
      if (img.startsWith('data:')) {
        const base64Data = img.split(',')[1];
        const sizeInBytes = (base64Data.length * 3) / 4;
        if (sizeInBytes > MAX_IMAGE_SIZE) {
          return new Response(
            JSON.stringify({ error: `Image ${i + 1} exceeds maximum size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log(`Analyzing ${imageArray.length} workflow image(s)...`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout (Edge Functions have 60s limit)

    try {
      // Build the content array with all images
      const userContent: any[] = [
        {
          type: 'text',
          text: imageArray.length > 1 
            ? `Analyze these ${imageArray.length} workflow images and combine them into a single cohesive workflow. Extract all nodes, connections, and workflow logic from all images. If there are overlapping or related concepts, merge them intelligently. Return structured JSON data.`
            : 'Analyze this workflow image and extract all nodes, connections, and workflow logic. Return structured JSON data.'
        }
      ];

      // Add all images to the content
      imageArray.forEach((img: string) => {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: img // base64 data URL or https URL
          }
        });
      });

      // Use Gemini 2.5 Flash for vision analysis (free during promo)
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are an Expert Workflow Understanding Engine. Analyze images containing workflows, diagrams, sketches, or process descriptions and extract structured workflow data.

${GUARDRAIL_SYSTEM_PROMPT}

${existingWorkflow ? `
IMPORTANT: You are IMPROVING an existing workflow. The user has provided an image to enhance their current workflow.

EXISTING WORKFLOW:
${JSON.stringify(existingWorkflow, null, 2)}

Your task:
1. Understand the existing workflow structure
2. Analyze the provided image(s) for new features/nodes
3. Integrate image insights with existing workflow
4. Keep relevant existing nodes
5. Add new nodes from the image
6. Maintain logical connections
7. Preserve node IDs for unchanged nodes
8. Generate new IDs only for new nodes
9. Explain what was improved/added in the insights
` : 'Your task:'}
1. Identify all workflow nodes (triggers, actions, conditions, data operations, AI steps) across ALL provided images
2. Detect connections and flow between nodes, even across different images
3. Extract node properties (titles, descriptions, types)
4. Infer logical relationships and dependencies
5. If multiple images are provided, intelligently combine them into a single cohesive workflow
6. Position nodes logically to show the combined flow
7. Generate a complete, executable workflow JSON

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "trigger|action|condition|data|ai",
      "title": "Node Title",
      "description": "Detailed description of what this node does",
      "x": 100,
      "y": 100
    }
  ],
  "insights": "AI analysis of the workflow - what it does, how the images were combined, potential improvements, missing steps"
}`
            },
            {
              role: 'user',
              content: userContent
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        }),
      });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let workflowData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      workflowData = JSON.parse(jsonStr);

      // Automatically inject guardrail nodes
      if (workflowData.nodes) {
        const injectionResult = injectGuardrailNodes(workflowData.nodes);
        workflowData.nodes = injectionResult.nodes;
        workflowData.guardrailExplanations = injectionResult.explanations;
        workflowData.complianceStandards = injectionResult.complianceStandards;
        workflowData.guardrailsAdded = injectionResult.guardrailsAdded;
        console.log('Guardrail nodes injected from image analysis:', injectionResult.guardrailsAdded);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI returned invalid JSON format');
    }

    return new Response(
      JSON.stringify(workflowData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    } catch (aiError) {
      clearTimeout(timeoutId);
      if (aiError instanceof Error && aiError.name === 'AbortError') {
        console.error('AI request timed out');
        return new Response(
          JSON.stringify({ error: 'Request timed out. Please try with a smaller image.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw aiError;
    }

  } catch (error) {
    console.error('Error in analyze-workflow-image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
