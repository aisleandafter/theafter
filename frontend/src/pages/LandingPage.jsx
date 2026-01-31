import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

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
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"
          alt="Wedding"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="hero-overlay" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-end items-center">
          {user && (
            <Button 
              variant="ghost" 
              onClick={() => navigate(user.is_host ? '/admin' : '/discover')}
              className="text-foreground hover:text-foreground/70 tracking-wide text-sm"
              data-testid="dashboard-btn"
            >
              Dashboard
            </Button>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-8 pb-24">
          <div className="space-y-10 animate-fade-in">
            {/* Logo - Large & Centered */}
            <div className="mb-8 text-center">
              <img src={LOGO_URL} alt="aisle & after" className="h-48 md:h-56 mx-auto" />
            </div>
            
            {/* Title */}
            <div className="space-y-1">
              <p className="text-2xl md:text-3xl text-foreground leading-snug">
                From celebrating love…
              </p>
              <p className="text-2xl md:text-3xl text-foreground/60 leading-snug">
                to finding it after the aisle, maybe.
              </p>
            </div>

            {/* Event Code Input */}
            <div className="space-y-3 pt-4">
              <p className="text-sm tracking-wide text-muted-foreground uppercase">
                Introductions begin here
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter code"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="bg-white border-border/50 focus:border-foreground h-14 text-base tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:normal-case"
                  maxLength={6}
                  data-testid="event-code-input"
                />
                <Button 
                  onClick={handleJoinEvent}
                  disabled={isJoining}
                  className="bg-foreground hover:bg-foreground/90 text-white h-14 px-6 rounded-sm"
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
                Ask the couple for the code
              </p>
            </div>

            {/* Features */}
            <div className="pt-8">
              <div className="elegant-divider text-xs tracking-[0.2em] text-muted-foreground uppercase">
                The Experience
              </div>
              <div className="grid grid-cols-3 gap-6 mt-8">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto border border-border flex items-center justify-center">
                    <Users className="w-5 h-5 text-foreground/70" />
                  </div>
                  <p className="text-xs tracking-wide text-muted-foreground">Meet the Guests</p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto border border-border flex items-center justify-center">
                    <svg className="w-5 h-5 text-foreground/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <p className="text-xs tracking-wide text-muted-foreground">Find Matches</p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto border border-border flex items-center justify-center">
                    <svg className="w-5 h-5 text-foreground/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs tracking-wide text-muted-foreground">Start Talking</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <Button 
            variant="ghost" 
            onClick={handleHostClick}
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide"
            data-testid="host-wedding-btn"
          >
            Hosting a wedding? Create your event
          </Button>
        </footer>
      </div>

      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-white border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground tracking-tight">Join Wedding Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Enter 6-digit code"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              className="h-14 text-center text-2xl tracking-[0.5em]"
              maxLength={6}
            />
            <Button 
              onClick={handleJoinEvent}
              disabled={isJoining}
              className="w-full bg-foreground hover:bg-foreground/90 h-12"
            >
              {isJoining ? 'Joining...' : 'Join Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
