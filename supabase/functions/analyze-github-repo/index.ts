import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl, existingWorkflow } = await req.json();
    
    if (!repoUrl) {
      throw new Error('Repository URL is required');
    }

    console.log('Analyzing GitHub repository:', repoUrl);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Extract owner and repo from URL
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoUrl.match(urlPattern);
    
    if (!match) {
      throw new Error('Invalid GitHub repository URL format');
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    console.log(`Repository: ${owner}/${cleanRepo}`);

    // Fetch repository metadata from GitHub API
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Remora-Flow-Workflow-Analyzer'
      }
    });

    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository: ${repoResponse.statusText}`);
    }

    const repoData = await repoResponse.json();

    // Fetch README if available
    let readmeContent = '';
    try {
      const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/readme`, {
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Remora-Flow-Workflow-Analyzer'
        }
      });
      if (readmeResponse.ok) {
        readmeContent = await readmeResponse.text();
      }
    } catch (error) {
      console.log('No README found or error fetching:', error);
    }

    // Fetch repository structure (main files/directories)
    let repoStructure = '';
    try {
      const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Remora-Flow-Workflow-Analyzer'
        }
      });
      if (contentsResponse.ok) {
        const contents = await contentsResponse.json();
        repoStructure = contents.map((item: any) => `${item.type === 'dir' ? '📁' : '📄'} ${item.name}`).join('\n');
      }
    } catch (error) {
      console.log('Error fetching repo structure:', error);
    }

    // Build comprehensive context
    const repoContext = `
GitHub Repository Analysis:
Repository: ${repoData.full_name}
Description: ${repoData.description || 'No description provided'}
Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stargazers_count}
Forks: ${repoData.forks_count}
Topics: ${repoData.topics?.join(', ') || 'None'}

Repository Structure:
${repoStructure}

README Content:
${readmeContent.substring(0, 3000)}
${readmeContent.length > 3000 ? '\n... (truncated)' : ''}
`;

    // Generate workflow using AI
    const systemPrompt = `You are an AI Workflow Architect that analyzes GitHub repositories and generates structured workflow definitions.

Given a GitHub repository's metadata, README, and structure, extract workflow patterns, automation opportunities, and process flows.

Focus on:
1. CI/CD workflows (GitHub Actions, deployment pipelines)
2. Development workflows (build, test, deploy processes)
3. Automation patterns in the codebase
4. Integration points and APIs
5. Data processing pipelines
6. Any documented processes in README

Return a complete workflow architecture with:
- Nodes representing each step/action
- Clear connections showing data/control flow
- Configuration for each node
- Guardrails for security and compliance

${existingWorkflow ? `\nExtend this existing workflow:\n${JSON.stringify(existingWorkflow, null, 2)}` : ''}`;

    const userPrompt = `Analyze this GitHub repository and generate workflow(s):\n\n${repoContext}`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response received');

    // Parse the AI response for workflow data
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                     aiResponse.match(/\{[\s\S]*"nodes"[\s\S]*\}/);
    
    if (jsonMatch) {
      const workflowData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      
      return new Response(JSON.stringify({
        nodes: workflowData.nodes || [],
        insights: aiResponse,
        context: {
          repository: repoData.full_name,
          language: repoData.language,
          description: repoData.description
        },
        metadata: {
          guardrailExplanations: workflowData.guardrailExplanations || [],
          complianceStandards: workflowData.complianceStandards || [],
          riskScore: workflowData.riskScore || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Failed to parse workflow from AI response');

  } catch (error: any) {
    console.error('Error analyzing GitHub repository:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to analyze GitHub repository'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
