import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, MessageCircle, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeClass, setSwipeClass] = useState('');
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await axios.get(`${API}/discover`);
      setProfiles(res.data.profiles);
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = async (action) => {
    if (currentIndex >= profiles.length) return;

    const targetUser = profiles[currentIndex];
    setSwipeClass(action === 'like' ? 'swipe-right' : 'swipe-left');

    try {
      const res = await axios.post(`${API}/swipe`, {
        target_user_id: targetUser.id,
        action
      });

      if (res.data.is_match) {
        setMatchedUser(res.data.match.matched_user);
        setTimeout(() => setShowMatch(true), 400);
      }
    } catch (err) {
      console.error('Swipe failed:', err);
    }

    setTimeout(() => {
      setSwipeClass('');
      setCurrentIndex(prev => prev + 1);
    }, 400);
  };

  const currentProfile = profiles[currentIndex];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="mobile-container min-h-screen bg-white relative noise-bg" data-testid="discover-page">
      {/* Header */}
      <header className="p-4 flex justify-between items-center sticky top-0 glass-header z-20">
        <img src={LOGO_URL} alt="aisle & after" className="h-10" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/matches')}
            className="text-foreground/60 hover:text-foreground"
            data-testid="matches-btn"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-foreground/60 hover:text-foreground"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-36">
        {isLoading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : currentProfile ? (
          <div className={`profile-card card-modern overflow-hidden ${swipeClass}`} data-testid="profile-card">
            {/* Profile Image */}
            <div className="aspect-[3/4] overflow-hidden bg-muted relative">
              {currentProfile.photo_url ? (
                <img 
                  src={currentProfile.photo_url} 
                  alt={currentProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <User className="w-20 h-20 text-muted-foreground/20" />
                </div>
              )}
              
              {/* Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                <h2 className="font-serif text-3xl text-white tracking-tight">
                  {currentProfile.name}, {currentProfile.age}
                </h2>
                {currentProfile.relationship_to_couple && (
                  <p className="font-sans text-sm text-white/70 mt-1">{currentProfile.relationship_to_couple}</p>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-4">
              {/* Bio */}
              {currentProfile.bio && (
                <p className="font-serif text-lg text-foreground leading-relaxed">{currentProfile.bio}</p>
              )}

              {/* Fun Fact */}
              {currentProfile.fun_fact && (
                <div className="bg-muted/50 p-4 rounded-lg border-l-2 border-foreground/10">
                  <p className="font-serif text-foreground/70 italic">
                    "{currentProfile.fun_fact}"
                  </p>
                </div>
              )}

              {/* Interests */}
              {currentProfile.interests?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {currentProfile.interests.map(interest => (
                    <span 
                      key={interest}
                      className="interest-tag"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="font-serif text-2xl text-foreground mb-2">No More Profiles</h3>
            <p className="font-sans text-sm text-muted-foreground mb-6">
              You've seen everyone at this event. Check back later.
            </p>
            <Button
              onClick={() => navigate('/matches')}
              className="bg-foreground hover:bg-foreground/90 rounded-full btn-pill"
              data-testid="view-matches-btn"
            >
              View Your Matches
            </Button>
          </div>
        )}
      </main>

      {/* Swipe Buttons */}
      {currentProfile && !isLoading && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-md mx-auto flex justify-center gap-12">
            <button
              onClick={() => handleSwipe('pass')}
              className="swipe-btn swipe-btn-pass"
              data-testid="pass-btn"
            >
              <X className="w-7 h-7" />
            </button>
            <button
              onClick={() => handleSwipe('like')}
              className="swipe-btn swipe-btn-like"
              data-testid="like-btn"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Match Dialog */}
      <Dialog open={showMatch} onOpenChange={setShowMatch}>
        <DialogContent className="bg-white border-0 shadow-elevated max-w-sm mx-4 rounded-2xl">
          <div className="text-center space-y-8 py-6">
            <div className="match-animation">
              <div className="w-20 h-20 mx-auto bg-foreground rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="font-serif text-4xl text-foreground tracking-tight">It's a Match</h2>
              <p className="font-sans text-muted-foreground">
                You and {matchedUser?.name} liked each other
              </p>
            </div>

            <div className="flex justify-center">
              {matchedUser?.photo_url ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-muted">
                  <img 
                    src={matchedUser.photo_url} 
                    alt={matchedUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowMatch(false)}
                className="flex-1 rounded-full h-12 font-sans"
                data-testid="keep-swiping-btn"
              >
                Keep Swiping
              </Button>
              <Button
                onClick={() => {
                  setShowMatch(false);
                  navigate('/matches');
                }}
                className="flex-1 bg-foreground hover:bg-foreground/90 rounded-full h-12 font-sans"
                data-testid="send-message-btn"
              >
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Nav */}
      <nav className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-border/40 rounded-full px-8 py-3 shadow-medium z-10">
        <div className="flex items-center gap-8">
          <button 
            className="nav-item-active p-2"
            onClick={() => navigate('/discover')}
            data-testid="nav-discover"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate('/matches')}
            data-testid="nav-matches"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
