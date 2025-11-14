import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decompress } from "https://deno.land/x/zip@v1.2.5/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectData, projectName, existingWorkflow } = await req.json();
    
    if (!projectData) {
      throw new Error('Project data is required');
    }

    console.log('Analyzing IDE project:', projectName);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Decode base64 project data
    const base64Data = projectData.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Create temporary directory for extraction
    const tempDir = await Deno.makeTempDir();
    const zipPath = `${tempDir}/project.zip`;
    
    try {
      // Write zip file
      await Deno.writeFile(zipPath, binaryData);

      // Extract zip
      await decompress(zipPath, tempDir);

      // Analyze project structure
      const projectStructure = await analyzeDirectory(tempDir);
      
      // Detect IDE and project type
      const ideInfo = detectIDE(projectStructure);
      
      // Extract key configuration files
      const configFiles = await extractConfigFiles(tempDir, projectStructure);

      // Build comprehensive context
      const projectContext = `
IDE Project Analysis:
Project Name: ${projectName}
IDE Detected: ${ideInfo.ide}
Project Type: ${ideInfo.projectType}
Languages: ${ideInfo.languages.join(', ')}

Project Structure:
${projectStructure.tree}

Key Files:
${Object.entries(configFiles).map(([name, content]) => `
--- ${name} ---
${content.substring(0, 500)}${content.length > 500 ? '\n... (truncated)' : ''}
`).join('\n')}

Dependencies:
${JSON.stringify(ideInfo.dependencies, null, 2)}

Entry Points:
${ideInfo.entryPoints.join('\n')}
`;

      // Generate workflow using AI
      const systemPrompt = `You are an AI Workflow Architect that analyzes IDE projects and generates structured workflow definitions.

Given an IDE project's structure, configuration files, and code organization, extract application workflows, processes, and automation patterns.

Focus on:
1. Application architecture and component relationships
2. Build and deployment processes
3. API endpoints and data flows
4. Background jobs and scheduled tasks
5. Testing and quality assurance workflows
6. Development workflows (dev, staging, production)
7. Integration points and external services

Return a complete workflow architecture with:
- Nodes representing each component/service/process
- Clear connections showing data/control flow
- Configuration for each node
- Guardrails for security and compliance

${existingWorkflow ? `\nExtend this existing workflow:\n${JSON.stringify(existingWorkflow, null, 2)}` : ''}`;

      const userPrompt = `Analyze this ${ideInfo.ide} ${ideInfo.projectType} project and generate comprehensive workflow(s):\n\n${projectContext}`;

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
            projectName,
            ide: ideInfo.ide,
            projectType: ideInfo.projectType,
            languages: ideInfo.languages
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

    } finally {
      // Cleanup
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }

  } catch (error: any) {
    console.error('Error analyzing IDE project:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to analyze IDE project'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeDirectory(dirPath: string, prefix = '', maxDepth = 3, currentDepth = 0): Promise<{ tree: string; files: string[] }> {
  let tree = '';
  const files: string[] = [];
  
  if (currentDepth >= maxDepth) return { tree, files };

  try {
    for await (const entry of Deno.readDir(dirPath)) {
      if (entry.name.startsWith('.') && !entry.name.match(/\.(vscode|idea|eclipse)/)) continue;
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
      
      tree += `${prefix}${entry.isDirectory ? '📁' : '📄'} ${entry.name}\n`;
      files.push(entry.name);
      
      if (entry.isDirectory) {
        const subResult = await analyzeDirectory(`${dirPath}/${entry.name}`, `${prefix}  `, maxDepth, currentDepth + 1);
        tree += subResult.tree;
        files.push(...subResult.files);
      }
    }
  } catch (e) {
    console.error('Error reading directory:', e);
  }

  return { tree, files };
}

function detectIDE(structure: { tree: string; files: string[] }) {
  const ideInfo = {
    ide: 'Unknown',
    projectType: 'Unknown',
    languages: [] as string[],
    dependencies: {} as Record<string, any>,
    entryPoints: [] as string[]
  };

  // Detect IDE
  if (structure.files.includes('.vscode')) ideInfo.ide = 'VS Code';
  else if (structure.files.includes('.idea')) ideInfo.ide = 'IntelliJ IDEA';
  else if (structure.files.includes('.project')) ideInfo.ide = 'Eclipse';
  else if (structure.files.includes('workspace.xml')) ideInfo.ide = 'WebStorm/PhpStorm';

  // Detect project type and languages
  if (structure.files.includes('package.json')) {
    ideInfo.projectType = 'Node.js/JavaScript';
    ideInfo.languages.push('JavaScript', 'TypeScript');
    ideInfo.entryPoints.push('index.js', 'index.ts', 'server.js', 'app.js');
  }
  if (structure.files.includes('pom.xml') || structure.files.includes('build.gradle')) {
    ideInfo.projectType = 'Java';
    ideInfo.languages.push('Java');
  }
  if (structure.files.includes('requirements.txt') || structure.files.includes('setup.py') || structure.files.includes('Pipfile')) {
    ideInfo.projectType = 'Python';
    ideInfo.languages.push('Python');
    ideInfo.entryPoints.push('main.py', 'app.py', 'manage.py');
  }
  if (structure.files.includes('Cargo.toml')) {
    ideInfo.projectType = 'Rust';
    ideInfo.languages.push('Rust');
  }
  if (structure.files.includes('go.mod')) {
    ideInfo.projectType = 'Go';
    ideInfo.languages.push('Go');
    ideInfo.entryPoints.push('main.go');
  }
  if (structure.files.includes('.csproj') || structure.files.includes('.sln')) {
    ideInfo.projectType = '.NET/C#';
    ideInfo.languages.push('C#');
  }

  return ideInfo;
}

async function extractConfigFiles(dirPath: string, structure: { files: string[] }): Promise<Record<string, string>> {
  const configs: Record<string, string> = {};
  
  const configFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'webpack.config.js',
    'docker-compose.yml',
    'Dockerfile',
    '.env.example',
    'README.md',
    'pom.xml',
    'build.gradle',
    'requirements.txt',
    'Cargo.toml',
    'go.mod'
  ];

  for (const configFile of configFiles) {
    if (structure.files.includes(configFile)) {
      try {
        const content = await Deno.readTextFile(`${dirPath}/${configFile}`);
        configs[configFile] = content;
      } catch (e) {
        console.error(`Error reading ${configFile}:`, e);
      }
    }
  }

  return configs;
}
