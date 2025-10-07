import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Store, 
  Download, 
  Star, 
  TrendingUp, 
  Shield, 
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: any[];
  use_count: number;
  created_at: string;
  is_public: boolean;
  created_by: string;
}

interface TemplateMarketplaceProps {
  onImportTemplate: (template: any) => void;
}

const TemplateMarketplace = ({ onImportTemplate }: TemplateMarketplaceProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const categories = [
    'all',
    'customer-service',
    'data-processing',
    'marketing',
    'security',
    'integration',
    'analytics'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true)
        .order('use_count', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        nodes: typeof item.nodes === 'string' ? JSON.parse(item.nodes) : (Array.isArray(item.nodes) ? item.nodes : [])
      }));
      
      setTemplates(transformedData);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportTemplate = async (template: Template) => {
    try {
      // Increment use count
      await supabase
        .from('workflow_templates')
        .update({ use_count: template.use_count + 1 })
        .eq('id', template.id);

      onImportTemplate({
        nodes: template.nodes,
        name: template.name
      });

      toast({
        title: "Template Imported",
        description: `${template.name} has been added to your canvas`,
      });
    } catch (error) {
      console.error('Error importing template:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import template",
        variant: "destructive"
      });
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTemplateBadge = (isPublic: boolean) => {
    return (
      <Badge variant={isPublic ? 'default' : 'secondary'} className="gap-1">
        <Shield className="h-3 w-3" />
        {isPublic ? 'Public' : 'Private'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>Template Marketplace</CardTitle>
          </div>
          <CardDescription>
            Browse and import pre-built workflow templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap"
                >
                  {cat === 'all' ? <Filter className="h-4 w-4 mr-1" /> : null}
                  {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No templates found
              </div>
            ) : (
              filteredTemplates.map(template => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      {getTemplateBadge(template.is_public)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {template.use_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(template.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleImportTemplate(template)}
                      className="w-full"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Import Template
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateMarketplace;
