import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [eventCode, setEventCode] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinEvent = async () => {
    if (!eventCode.trim()) {
      toast.error('Please enter an event code');
      return;
    }

    if (!user) {
      localStorage.setItem('pendingEventCode', eventCode.toUpperCase());
      navigate('/auth');
      return;
    }

    setIsJoining(true);
    try {
      const res = await axios.post(`${API}/events/join`, { event_code: eventCode });
      updateUser({ event_id: res.data.event.id });
      toast.success(`Joined ${res.data.event.bride_name} & ${res.data.event.groom_name}'s wedding!`);
      navigate(user.profile_complete ? '/discover' : '/profile-setup');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid event code');
    } finally {
      setIsJoining(false);
    }
  };

  const handleHostClick = () => {
    if (user?.is_host) {
      navigate('/admin');
    } else {
      localStorage.setItem('isHostSignup', 'true');
      navigate('/auth');
    }
  };

  return (
    <div className="mobile-container relative overflow-hidden" data-testid="landing-page">
      {/* Hero Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1763984266799-fbcd1983f799?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwZmxvd2VycyUyMGVsZWdhbnR8ZW58MHx8fHwxNzY5Nzk3NzA4fDA&ixlib=rb-4.1.0&q=85"
          alt="Wedding ambiance"
          className="w-full h-full object-cover"
        />
        <div className="hero-overlay" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose fill-rose" />
            <span className="font-serif text-xl text-charcoal">Serendipity</span>
          </div>
          {user && (
            <Button 
              variant="ghost" 
              onClick={() => navigate(user.is_host ? '/admin' : '/discover')}
              className="text-charcoal hover:text-sage"
              data-testid="dashboard-btn"
            >
              Dashboard
            </Button>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-6 pb-20">
          <div className="space-y-8 animate-fade-in">
            {/* Title */}
            <div className="space-y-4">
              <p className="font-accent text-lg text-sage tracking-wide">Where Love Blooms</p>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal leading-tight">
                Find Your <br />
                <span className="text-rose">Wedding</span> Match
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                Connect with other single guests at the celebration. Your next story might begin with a dance.
              </p>
            </div>

            {/* Event Code Input */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Enter event code"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="bg-white/80 backdrop-blur border-border focus:border-sage h-14 text-lg font-mono tracking-widest uppercase"
                  maxLength={6}
                  data-testid="event-code-input"
                />
                <Button 
                  onClick={handleJoinEvent}
                  disabled={isJoining}
                  className="bg-sage hover:bg-sage/90 text-white h-14 px-6 rounded-xl transition-transform hover:scale-105 active:scale-95"
                  data-testid="join-event-btn"
                >
                  {isJoining ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Ask the bride & groom for the event code
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-sage/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-sage" />
                </div>
                <p className="text-xs text-muted-foreground">Meet Singles</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-rose/10 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-rose" />
                </div>
                <p className="text-xs text-muted-foreground">Find Matches</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-accent/30 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-charcoal" />
                </div>
                <p className="text-xs text-muted-foreground">Spark Love</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <Button 
            variant="ghost" 
            onClick={handleHostClick}
            className="text-sage hover:text-sage/80 font-serif"
            data-testid="host-wedding-btn"
          >
            Hosting a wedding? Create your event
          </Button>
        </footer>
      </div>

      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-bone border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-charcoal">Join Wedding Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Enter 6-digit code"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              className="h-14 text-center text-2xl font-mono tracking-[0.5em]"
              maxLength={6}
            />
            <Button 
              onClick={handleJoinEvent}
              disabled={isJoining}
              className="w-full bg-sage hover:bg-sage/90 h-12"
            >
              {isJoining ? 'Joining...' : 'Join Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
