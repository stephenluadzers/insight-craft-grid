import { useState, useRef, useEffect } from "react";
import { Bot, Send, Calendar, ClipboardList, User, X, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: ChatAction;
  actionCompleted?: boolean;
}

interface ChatAction {
  type: "form" | "schedule" | "confirm";
  title: string;
  fields?: FormField[];
  slots?: TimeSlot[];
  confirmText?: string;
}

interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select";
  options?: string[];
  required?: boolean;
  value?: string;
}

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
}

interface ChatbotWithActionsProps {
  botName?: string;
  welcomeMessage?: string;
  onActionComplete?: (action: ChatAction, data: Record<string, any>) => void;
}

export const ChatbotWithActions = ({
  botName = "FlowBot",
  welcomeMessage = "Hi! I can help you schedule demos, collect information, and more. What can I help you with?",
  onActionComplete,
}: ChatbotWithActionsProps) => {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const simulateBotResponse = async (userMessage: string): Promise<Message> => {
    // Simulate AI processing
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));

    const lowerMessage = userMessage.toLowerCase();

    // Demo scheduling flow
    if (lowerMessage.includes("demo") || lowerMessage.includes("schedule") || lowerMessage.includes("meeting")) {
      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "I'd be happy to help you schedule a demo! Please select a time that works for you:",
        action: {
          type: "schedule",
          title: "Schedule Your Demo",
          slots: [
            { id: "1", date: "Tomorrow", time: "10:00 AM", available: true },
            { id: "2", date: "Tomorrow", time: "2:00 PM", available: true },
            { id: "3", date: "Wed, Jan 22", time: "11:00 AM", available: true },
            { id: "4", date: "Wed, Jan 22", time: "3:00 PM", available: false },
            { id: "5", date: "Thu, Jan 23", time: "10:00 AM", available: true },
            { id: "6", date: "Thu, Jan 23", time: "4:00 PM", available: true },
          ],
        },
      };
    }

    // Contact/lead form flow
    if (lowerMessage.includes("contact") || lowerMessage.includes("reach") || lowerMessage.includes("call")) {
      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "Sure! Please fill out this quick form and we'll get back to you shortly:",
        action: {
          type: "form",
          title: "Contact Information",
          fields: [
            { id: "name", label: "Your Name", type: "text", required: true },
            { id: "email", label: "Email Address", type: "email", required: true },
            { id: "phone", label: "Phone Number", type: "phone" },
            { id: "interest", label: "Area of Interest", type: "select", options: ["Product Demo", "Pricing", "Technical Support", "Partnership"] },
          ],
        },
      };
    }

    // Support flow
    if (lowerMessage.includes("support") || lowerMessage.includes("help") || lowerMessage.includes("issue")) {
      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "I can help you get support. Would you like to schedule a call with our team?",
        action: {
          type: "confirm",
          title: "Schedule Support Call",
          confirmText: "Yes, schedule a support call",
        },
      };
    }

    // Default response
    return {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: "I can help you with:\n\n• **Schedule a demo** - Book a time to see our product\n• **Contact us** - Fill out a form and we'll reach out\n• **Get support** - Connect with our team\n\nWhat would you like to do?",
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await simulateBotResponse(input);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionComplete = (messageId: string, action: ChatAction, data: Record<string, any>) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, actionCompleted: true } : msg
      )
    );

    // Add confirmation message
    let confirmationContent = "";
    if (action.type === "schedule") {
      const slot = action.slots?.find((s) => s.id === data.slotId);
      confirmationContent = `Your demo has been scheduled for **${slot?.date}** at **${slot?.time}**. You'll receive a confirmation email shortly.`;
    } else if (action.type === "form") {
      confirmationContent = `Thanks, ${data.name || ""}! We've received your information and will be in touch soon.`;
    } else if (action.type === "confirm") {
      confirmationContent = "I'll connect you with our support team. Expect a call within the next business day!";
    }

    const confirmMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: confirmationContent,
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, confirmMessage]);
    }, 500);

    onActionComplete?.(action, data);

    toast({
      title: "Action completed",
      description: action.type === "schedule" ? "Demo scheduled!" : "Information submitted",
    });
  };

  const handleFormSubmit = (messageId: string, action: ChatAction) => {
    if (action.fields?.some((f) => f.required && !formData[f.id])) {
      toast({
        title: "Missing required fields",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
      return;
    }
    handleActionComplete(messageId, action, formData);
    setFormData({});
  };

  const renderAction = (message: Message) => {
    if (!message.action || message.actionCompleted) return null;

    const { action } = message;

    if (action.type === "schedule") {
      return (
        <Card className="mt-3 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {action.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {action.slots?.map((slot) => (
                <button
                  key={slot.id}
                  disabled={!slot.available}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    slot.available
                      ? "hover:border-primary hover:bg-primary/5 cursor-pointer"
                      : "opacity-50 cursor-not-allowed bg-muted"
                  )}
                  onClick={() => slot.available && handleActionComplete(message.id, action, { slotId: slot.id })}
                >
                  <p className="text-sm font-medium">{slot.date}</p>
                  <p className="text-xs text-muted-foreground">{slot.time}</p>
                  {!slot.available && (
                    <Badge variant="secondary" className="text-[10px] mt-1">Unavailable</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (action.type === "form") {
      return (
        <Card className="mt-3 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              {action.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {action.fields?.map((field) => (
              <div key={field.id}>
                <Label className="text-xs">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "select" ? (
                  <Select
                    value={formData[field.id] || ""}
                    onValueChange={(v) => setFormData({ ...formData, [field.id]: v })}
                  >
                    <SelectTrigger className="h-9 mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type}
                    className="h-9 mt-1"
                    value={formData[field.id] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <Button
              className="w-full"
              onClick={() => handleFormSubmit(message.id, action)}
            >
              Submit
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (action.type === "confirm") {
      return (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => handleActionComplete(message.id, action, { confirmed: true })}
          >
            <Check className="w-4 h-4 mr-1.5" />
            {action.confirmText || "Confirm"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === message.id ? { ...msg, actionCompleted: true } : msg
                )
              )
            }
          >
            <X className="w-4 h-4 mr-1.5" />
            No thanks
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full max-w-md mx-auto h-[600px] flex flex-col">
      {/* Header */}
      <CardHeader className="border-b py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{botName}</CardTitle>
            <p className="text-xs text-muted-foreground">Online • Ready to help</p>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%]",
                  message.role === "user" ? "text-right" : ""
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
                    __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                  }} />
                </div>
                {renderAction(message)}
                {message.actionCompleted && message.action && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              {message.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isTyping}
          />
          <Button size="icon" onClick={handleSend} disabled={isTyping || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Powered by FlowFuse • Built-in actions enabled
        </p>
      </div>
    </Card>
  );
};
