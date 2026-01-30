import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, User, Sparkles, MessageCircle, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
        setTimeout(() => setShowMatch(true), 300);
      }
    } catch (err) {
      console.error('Swipe failed:', err);
    }

    setTimeout(() => {
      setSwipeClass('');
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  const currentProfile = profiles[currentIndex];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="mobile-container min-h-screen bg-bone relative" data-testid="discover-page">
      {/* Header */}
      <header className="p-4 flex justify-between items-center sticky top-0 bg-bone/80 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose fill-rose" />
          <span className="font-serif text-xl text-charcoal">Discover</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/matches')}
            className="text-sage hover:text-sage/80"
            data-testid="matches-btn"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-charcoal"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-32">
        {isLoading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentProfile ? (
          <div className={`profile-card card-tilt ${swipeClass}`} data-testid="profile-card">
            {/* Profile Image */}
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted mb-4 relative">
              {currentProfile.photo_url ? (
                <img 
                  src={currentProfile.photo_url} 
                  alt={currentProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-sage/10">
                  <User className="w-20 h-20 text-sage/30" />
                </div>
              )}
              
              {/* Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <h2 className="font-serif text-2xl text-white">
                  {currentProfile.name}, {currentProfile.age}
                </h2>
                {currentProfile.relationship_to_couple && (
                  <p className="text-white/80 text-sm">{currentProfile.relationship_to_couple}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {currentProfile.bio && (
              <p className="text-charcoal mb-4">{currentProfile.bio}</p>
            )}

            {/* Fun Fact */}
            {currentProfile.fun_fact && (
              <div className="bg-accent/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-charcoal">
                  <Sparkles className="w-4 h-4 inline mr-2 text-sage" />
                  {currentProfile.fun_fact}
                </p>
              </div>
            )}

            {/* Interests */}
            {currentProfile.interests?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentProfile.interests.map(interest => (
                  <Badge 
                    key={interest}
                    variant="outline"
                    className="interest-tag"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-sage" />
            </div>
            <h3 className="font-serif text-xl text-charcoal mb-2">No More Profiles</h3>
            <p className="text-muted-foreground mb-4">
              You've seen everyone at this event! Check back later for new guests.
            </p>
            <Button
              onClick={() => navigate('/matches')}
              className="bg-sage hover:bg-sage/90"
              data-testid="view-matches-btn"
            >
              View Your Matches
            </Button>
          </div>
        )}
      </main>

      {/* Swipe Buttons */}
      {currentProfile && !isLoading && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-bone via-bone to-transparent">
          <div className="max-w-md mx-auto flex justify-center gap-8">
            <button
              onClick={() => handleSwipe('pass')}
              className="swipe-btn swipe-btn-pass"
              data-testid="pass-btn"
            >
              <X className="w-8 h-8" />
            </button>
            <button
              onClick={() => handleSwipe('like')}
              className="swipe-btn swipe-btn-like"
              data-testid="like-btn"
            >
              <Heart className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* Match Dialog */}
      <Dialog open={showMatch} onOpenChange={setShowMatch}>
        <DialogContent className="bg-bone border-border max-w-sm mx-4 celebration-bg">
          <div className="text-center space-y-6 py-4">
            <div className="match-animation">
              <div className="w-24 h-24 mx-auto bg-rose/20 rounded-full flex items-center justify-center">
                <Heart className="w-12 h-12 text-rose fill-rose" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="font-serif text-3xl text-charcoal">It's a Match!</h2>
              <p className="text-muted-foreground">
                You and {matchedUser?.name} liked each other
              </p>
            </div>

            <div className="flex justify-center gap-4">
              {matchedUser?.photo_url ? (
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-rose/30">
                  <img 
                    src={matchedUser.photo_url} 
                    alt={matchedUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-sage/10 flex items-center justify-center border-4 border-sage/30">
                  <User className="w-8 h-8 text-sage/50" />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowMatch(false)}
                className="flex-1 border-border"
                data-testid="keep-swiping-btn"
              >
                Keep Swiping
              </Button>
              <Button
                onClick={() => {
                  setShowMatch(false);
                  navigate('/matches');
                }}
                className="flex-1 bg-rose hover:bg-rose/90"
                data-testid="send-message-btn"
              >
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Nav */}
      <nav className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur rounded-full px-6 py-3 shadow-floating z-10">
        <div className="flex items-center gap-6">
          <button 
            className="nav-item-active p-2"
            onClick={() => navigate('/discover')}
            data-testid="nav-discover"
          >
            <Heart className="w-5 h-5" />
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-sage"
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
