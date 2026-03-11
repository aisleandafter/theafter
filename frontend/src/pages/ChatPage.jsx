import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, User, Wand2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { getPhotoUrl } from '../utils/photo';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL.replace(/^https/, 'wss').replace(/^http/, 'ws');

export default function ChatPage() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { user, token } = useAuth();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [starters, setStarters] = useState([]);
  const [showStarters, setShowStarters] = useState(false);
  const [loadingStarters, setLoadingStarters] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchMatchInfo();
  }, [matchId]);

  // WebSocket connection
  useEffect(() => {
    if (!token || !matchId) return;

    const connectWs = () => {
      const ws = new WebSocket(`${WS_URL}/ws/chat/${matchId}?token=${token}`);
      
      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message) {
            setMessages(prev => {
              // Avoid duplicates (from optimistic update)
              const exists = prev.some(m => m.id === data.message.id);
              if (exists) return prev;
              // Skip own messages (already added optimistically)
              if (data.message.sender_id === user?.id) return prev;
              return [...prev, data.message];
            });
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Reconnect after 3s
        setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, matchId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/chat/${matchId}`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatchInfo = async () => {
    try {
      const res = await axios.get(`${API}/matches`);
      const match = res.data.matches.find(m => m.match_id === matchId);
      if (match) {
        setMatchInfo(match);
      }
    } catch (err) {
      console.error('Failed to fetch match info:', err);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    setShowStarters(false);

    // Optimistic update
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      content: messageContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await axios.post(`${API}/chat/send`, {
        match_id: matchId,
        content: messageContent
      });
      
      setMessages(prev => 
        prev.map(m => m.id === optimisticMsg.id ? res.data.message : m)
      );
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const fetchConversationStarters = async () => {
    if (starters.length > 0) {
      setShowStarters(!showStarters);
      return;
    }

    setLoadingStarters(true);
    try {
      const res = await axios.post(`${API}/ai/conversation-starters`, {
        match_id: matchId
      });
      setStarters(res.data.starters);
      setShowStarters(true);
    } catch (err) {
      toast.error('Failed to get conversation starters');
    } finally {
      setLoadingStarters(false);
    }
  };

  const selectStarter = (starter) => {
    setNewMessage(starter);
    setShowStarters(false);
  };

  const formatTime = (dateStr) => {
    try {
      return format(new Date(dateStr), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-white flex flex-col" data-testid="chat-page">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 glass-header sticky top-0 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/matches')}
          className="text-foreground -ml-2"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted/30">
            {matchInfo?.matched_user?.photo_url ? (
              <img 
                src={getPhotoUrl(matchInfo.matched_user.photo_url)}
                alt={matchInfo.matched_user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-serif text-lg text-foreground tracking-tight">
              {matchInfo?.matched_user?.name || 'Chat'}
            </h2>
            <p className="font-sans text-xs text-muted-foreground">
              {matchInfo?.matched_user?.relationship_to_couple || 'Wedding Guest'}
              {wsConnected && <span className="ml-2 inline-block w-1.5 h-1.5 bg-green-500 rounded-full" />}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchConversationStarters}
          disabled={loadingStarters}
          className="text-foreground/70 hover:text-foreground"
          data-testid="ai-starters-btn"
        >
          {loadingStarters ? (
            <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          ) : (
            <Wand2 className="w-5 h-5" />
          )}
        </Button>
      </header>

      {/* AI Conversation Starters */}
      {showStarters && starters.length > 0 && (
        <div className="p-4 bg-muted/30 border-b border-border/30 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 font-sans text-xs text-muted-foreground tracking-wide uppercase mb-3">
            <Wand2 className="w-3 h-3" />
            <span>AI Suggestions</span>
          </div>
          {starters.map((starter, i) => (
            <button
              key={i}
              onClick={() => selectStarter(starter)}
              className="w-full text-left p-3 bg-white font-sans text-sm text-foreground hover:bg-muted/30 transition-colors rounded-xl border border-border/30"
              data-testid={`starter-${i}`}
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((msg, index) => {
              const isSent = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id || index}
                  className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`chat-bubble ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                    <p className="font-sans text-sm">{msg.content}</p>
                    <p className={`font-sans text-xs mt-1 ${isSent ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2 tracking-tight">Say Hello</h3>
            <p className="font-sans text-sm text-muted-foreground mb-4">
              Start the conversation with {matchInfo?.matched_user?.name}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConversationStarters}
              className="rounded-full font-sans btn-pill"
              data-testid="get-starters-btn"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Get AI Suggestions
            </Button>
          </div>
        )}
      </main>

      {/* Message Input */}
      <div className="p-4 glass-header border-t border-border/30">
        <form onSubmit={handleSend} className="flex gap-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-12 bg-muted/30 border-border/30 focus:border-foreground rounded-full font-sans px-5"
            data-testid="message-input"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="h-12 w-12 bg-foreground hover:bg-foreground/90 rounded-full p-0"
            data-testid="send-btn"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
