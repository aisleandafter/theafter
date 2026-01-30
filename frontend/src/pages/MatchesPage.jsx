import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, User, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    <div className="mobile-container min-h-screen bg-bone" data-testid="matches-page">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 sticky top-0 bg-bone/80 backdrop-blur z-20 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/discover')}
          className="text-charcoal"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose fill-rose" />
          <span className="font-serif text-xl text-charcoal">Matches</span>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((match) => (
              <button
                key={match.match_id}
                onClick={() => navigate(`/chat/${match.match_id}`)}
                className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-card hover:shadow-floating transition-shadow text-left"
                data-testid={`match-${match.match_id}`}
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full overflow-hidden bg-sage/10 flex-shrink-0">
                  {match.matched_user?.photo_url ? (
                    <img 
                      src={match.matched_user.photo_url}
                      alt={match.matched_user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-sage/50" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-serif text-lg text-charcoal truncate">
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
                      : 'Start a conversation!'
                    }
                  </p>
                </div>

                {/* Arrow */}
                <MessageCircle className="w-5 h-5 text-sage flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-rose/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-rose" />
            </div>
            <h3 className="font-serif text-xl text-charcoal mb-2">No Matches Yet</h3>
            <p className="text-muted-foreground mb-4">
              Keep swiping to find your perfect match!
            </p>
            <Button
              onClick={() => navigate('/discover')}
              className="bg-sage hover:bg-sage/90"
              data-testid="discover-btn"
            >
              Start Discovering
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur rounded-full px-6 py-3 shadow-floating z-10">
        <div className="flex items-center gap-6">
          <button 
            className="p-2 text-muted-foreground hover:text-sage"
            onClick={() => navigate('/discover')}
            data-testid="nav-discover"
          >
            <Heart className="w-5 h-5" />
          </button>
          <button 
            className="nav-item-active p-2"
            onClick={() => navigate('/matches')}
            data-testid="nav-matches"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-sage"
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
