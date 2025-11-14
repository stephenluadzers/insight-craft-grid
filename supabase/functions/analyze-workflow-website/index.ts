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
    try {
      const websiteResponse = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WorkflowBot/1.0)'
        }
      });
      
      if (!websiteResponse.ok) {
        throw new Error(`Failed to fetch website: ${websiteResponse.status}`);
      }
      
      websiteContent = await websiteResponse.text();
      
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

    const systemPrompt = `You are an AI Workflow Architect analyzing website content to extract workflow structures and customer/business context.

CRITICAL TASKS:
1. Extract customer/business information (company names, contact info, product details, requirements)
2. Identify workflow patterns, business processes, or automation opportunities
3. Map website content to workflow nodes and connections

OUTPUT FORMAT (JSON):
{
  "workflows": [{
    "name": "Workflow Name",
    "nodes": [...],
    "connections": [...],
    "context": {
      "companyName": "extracted name",
      "productType": "extracted type",
      // any other relevant data fields
    }
  }],
  "insights": "What workflow patterns were found on the website",
  "explanation": "How the website content maps to automation workflows"
}

Extract all relevant data fields that could be used in workflow automation.`;

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
