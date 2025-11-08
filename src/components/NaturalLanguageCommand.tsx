import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NaturalLanguageCommandProps {
  workspaceId: string;
}

export const NaturalLanguageCommand = ({ workspaceId }: NaturalLanguageCommandProps) => {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const exampleCommands = [
    "Show me all failed workflows from yesterday",
    "Pause all marketing automation workflows",
    "What's the cost of my email workflows this month?",
    "Create a backup of all customer onboarding workflows",
    "Show workflows that need security review"
  ];

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('nl-workflow-command', {
        body: { command, workspaceId }
      });
      
      if (error) throw error;
      setResult(data);
      
      if (data.status === 'success') {
        toast.success('Command executed successfully');
      } else {
        toast.error('Command execution failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute command');
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Natural Language Control
        </h2>
        <p className="text-muted-foreground">Control your workflows with plain English</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            What would you like to do?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Try: 'Show me all workflows that cost more than $100 this month'"
            className="min-h-[100px]"
          />
          
          <Button 
            onClick={executeCommand} 
            disabled={loading || !command.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Execute Command
              </>
            )}
          </Button>

          <div className="space-y-2">
            <p className="text-sm font-medium">Example commands:</p>
            <div className="flex flex-wrap gap-2">
              {exampleCommands.map((example, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setCommand(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <div className="text-destructive">
                <p className="font-semibold">Error:</p>
                <p className="text-sm">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interpretation:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge>{result.interpretation?.command_type}</Badge>
                    <span className="text-sm">{result.interpretation?.action}</span>
                  </div>
                </div>
                
                {result.result && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Data:</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};