import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log('🔗 import-github-workflow function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    console.log('📥 GitHub URL:', url);

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Missing GitHub URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert GitHub blob URLs to raw URLs
    let rawUrl = url;
    if (url.includes('github.com') && url.includes('/blob/')) {
      rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      console.log('🔄 Converted to raw URL:', rawUrl);
    }

    // If it's a repo URL (no file specified), try to find workflow.json
    if (url.includes('github.com') && !url.includes('/blob/') && !url.includes('raw.githubusercontent.com')) {
      // Extract owner/repo and try common paths
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        const [, owner, repo] = match;
        const possiblePaths = [
          `https://raw.githubusercontent.com/${owner}/${repo}/main/workflow.json`,
          `https://raw.githubusercontent.com/${owner}/${repo}/master/workflow.json`,
          `https://raw.githubusercontent.com/${owner}/${repo}/main/workflows/workflow.json`,
        ];
        
        console.log('🔍 Trying common workflow paths...');
        for (const path of possiblePaths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              rawUrl = path;
              console.log('✅ Found workflow at:', rawUrl);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    }

    console.log('📡 Fetching from:', rawUrl);
    const response = await fetch(rawUrl);

    if (!response.ok) {
      console.error('❌ GitHub fetch failed:', response.status);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch from GitHub (${response.status}). Make sure the file is public and the URL is correct.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type');
    console.log('📄 Content type:', contentType);

    if (!contentType?.includes('application/json') && !contentType?.includes('text/plain')) {
      return new Response(
        JSON.stringify({ error: 'URL must point to a JSON file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('📦 Parsed workflow data');

    // Validate workflow structure
    if (!data.nodes || !Array.isArray(data.nodes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid workflow format: missing nodes array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform if needed to match our format
    const workflow = {
      name: data.name || 'Imported Workflow',
      nodes: data.nodes.map((node: any) => ({
        id: node.id,
        type: node.type || 'action',
        title: node.title || node.name || 'Unnamed Node',
        description: node.description || '',
        x: node.position?.x || node.x || 0,
        y: node.position?.y || node.y || 0,
        config: node.config || {}
      }))
    };

    console.log('✅ Successfully imported workflow with', workflow.nodes.length, 'nodes');

    return new Response(
      JSON.stringify(workflow),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to import workflow' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
