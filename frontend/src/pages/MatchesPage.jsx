import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, User, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

export default function MatchesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await axios.get(`${API}/matches`);
      setMatches(res.data.matches);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-white" data-testid="matches-page">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur z-20 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/discover')}
          className="text-foreground -ml-2"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <img src={LOGO_URL} alt="aisle & after" className="h-5" />
      </header>

      {/* Content */}
      <main className="p-4">
        <h1 className="text-2xl text-foreground tracking-tight mb-6">Your Matches</h1>
        
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border border-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((match) => (
              <button
                key={match.match_id}
                onClick={() => navigate(`/chat/${match.match_id}`)}
                className="w-full bg-white border border-border/50 p-4 flex items-center gap-4 hover:border-border transition-colors text-left card-hover"
                data-testid={`match-${match.match_id}`}
              >
                {/* Avatar */}
                <div className="w-14 h-14 overflow-hidden bg-muted/30 flex-shrink-0">
                  {match.matched_user?.photo_url ? (
                    <img 
                      src={match.matched_user.photo_url}
                      alt={match.matched_user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg text-foreground tracking-tight truncate">
                      {match.matched_user?.name}
                    </h3>
                    {match.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(match.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {match.last_message 
                      ? match.last_message.content
                      : 'Start a conversation'
                    }
                  </p>
                </div>

                {/* Arrow */}
                <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 border border-border flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="text-xl text-foreground mb-2 tracking-tight">No Matches Yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Keep swiping to find your perfect match
            </p>
            <Button
              onClick={() => navigate('/discover')}
              className="bg-foreground hover:bg-foreground/90 rounded-none"
              data-testid="discover-btn"
            >
              Start Discovering
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-border px-8 py-3 z-10">
        <div className="flex items-center gap-8">
          <button 
            className="p-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/discover')}
            data-testid="nav-discover"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button 
            className="nav-item-active p-2"
            onClick={() => navigate('/matches')}
            data-testid="nav-matches"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/profile-setup')}
            data-testid="nav-profile"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  );
}
