import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [eventCode, setEventCode] = useState('');
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
    <div className="mobile-container relative overflow-hidden noise-bg" data-testid="landing-page">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1649898733721-a78888fe6165?w=800&q=80"
          alt="Fashion couple"
          className="w-full h-full object-cover opacity-10"
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
              className="text-foreground/70 hover:text-foreground font-sans text-sm tracking-wide"
              data-testid="dashboard-btn"
            >
              Dashboard
            </Button>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-8 pb-20">
          <div className="space-y-8 animate-fade-up text-center">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="w-36 h-36 md:w-40 md:h-40 rounded-full border border-border/30 flex items-center justify-center bg-white/80 shadow-soft">
                <img src={LOGO_URL} alt="aisle & after" className="h-28 md:h-32" />
              </div>
            </div>
            
            {/* Headline */}
            <div className="space-y-1 pt-2">
              <h1 className="font-serif text-2xl md:text-3xl text-foreground tracking-tight leading-snug">
                From celebrating love…
              </h1>
              <p className="font-serif text-2xl md:text-3xl text-foreground/35 tracking-tight leading-snug">
                to finding it after the aisle, maybe.
              </p>
            </div>

            {/* Divider */}
            <div className="w-12 h-px bg-border/60 mx-auto"></div>

            {/* Event Code Input */}
            <div className="space-y-3 max-w-xs mx-auto">
              <p className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/70 uppercase">
                Introductions begin here
              </p>
              <div className="flex gap-3 justify-center">
                <Input
                  placeholder="Enter code"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="input-underline h-12 text-base tracking-[0.25em] uppercase font-sans placeholder:text-xs placeholder:tracking-normal placeholder:normal-case placeholder:text-muted-foreground/40 text-center w-40"
                  maxLength={6}
                  data-testid="event-code-input"
                />
                <Button 
                  onClick={handleJoinEvent}
                  disabled={isJoining}
                  className="bg-foreground hover:bg-foreground/90 text-white h-12 w-12 rounded-full btn-pill p-0"
                  data-testid="join-event-btn"
                >
                  {isJoining ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="font-sans text-xs text-muted-foreground/60">
                Ask the couple for the code
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6">
          <Button 
            variant="ghost" 
            onClick={handleHostClick}
            className="text-muted-foreground hover:text-foreground font-sans text-sm tracking-wide w-full justify-center"
            data-testid="host-wedding-btn"
          >
            Create your wedding event
          </Button>
        </footer>
      </div>
    </div>
  );
}
