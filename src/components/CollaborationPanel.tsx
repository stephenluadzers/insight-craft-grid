import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  MessageSquare, 
  Send,
  Activity,
  Circle,
  Eye,
  MousePointer
} from 'lucide-react';
import { CollaboratorPresence, CollaborationMessage, useCollaboration } from '@/hooks/useCollaboration';
import { formatDistanceToNow } from 'date-fns';

interface CollaborationPanelProps {
  workflowId: string | null;
  workspaceId: string | null;
  onClose?: () => void;
}

export const CollaborationPanel = ({ workflowId, workspaceId, onClose }: CollaborationPanelProps) => {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { collaborators, messages, currentUserId, sendMessage } = useCollaboration(workflowId, workspaceId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    await sendMessage(messageInput);
    setMessageInput('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'offline': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeCollaborators = collaborators.filter(c => c.status === 'online');
  const awayCollaborators = collaborators.filter(c => c.status === 'away');

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Collaboration</CardTitle>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            {activeCollaborators.length} online
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0 p-4">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="presence" className="gap-1">
              <Users className="h-4 w-4" />
              People
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col gap-2 min-h-0">
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.user_id === currentUserId ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="h-7 w-7 mt-1">
                        <AvatarFallback className="text-xs">
                          {getInitials(msg.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 ${msg.user_id === currentUserId ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{msg.profile?.full_name || 'Unknown'}</span>
                          <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 max-w-[85%] ${
                            msg.user_id === currentUserId
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Presence Tab */}
          <TabsContent value="presence" className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-4">
                {activeCollaborators.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Online</h4>
                    {activeCollaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {getInitials(collab.profile?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <Circle className={`absolute bottom-0 right-0 h-3 w-3 ${getStatusColor(collab.status)} fill-current`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {collab.profile?.full_name || 'Unknown User'}
                            {collab.user_id === currentUserId && ' (you)'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {collab.selected_node_id ? (
                              <>
                                <MousePointer className="h-3 w-3" />
                                <span>Editing node</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" />
                                <span>Viewing</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {awayCollaborators.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Away</h4>
                    {awayCollaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {getInitials(collab.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {collab.profile?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last seen {formatDistanceToNow(new Date(collab.last_active_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {collaborators.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No collaborators yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-2">
                <div className="text-center text-sm text-muted-foreground py-8">
                  Activity feed coming soon
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
