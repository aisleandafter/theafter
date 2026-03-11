import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

function CountdownDigit({ value, label }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 card-modern flex items-center justify-center mb-2">
        <span className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight">{String(value).padStart(2, '0')}</span>
      </div>
      <p className="font-sans text-xs text-muted-foreground tracking-wide uppercase">{label}</p>
    </div>
  );
}

export default function CountdownPage() {
  const { eventCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCountdown();
  }, [eventCode]);

  useEffect(() => {
    if (!data?.wedding_date) return;

    const tick = () => {
      const wedding = new Date(data.wedding_date + 'T00:00:00');
      const now = new Date();
      const diff = Math.max(0, wedding.getTime() - now.getTime());
      const totalSec = Math.floor(diff / 1000);
      setCountdown({
        days: Math.floor(totalSec / 86400),
        hours: Math.floor((totalSec % 86400) / 3600),
        minutes: Math.floor((totalSec % 3600) / 60),
        seconds: totalSec % 60,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data?.wedding_date]);

  const fetchCountdown = async () => {
    try {
      const res = await axios.get(`${API}/countdown/${eventCode}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Event not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = () => {
    localStorage.setItem('pendingEventCode', eventCode.toUpperCase());
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h2 className="font-serif text-2xl text-foreground mb-2">Event Not Found</h2>
        <p className="font-sans text-sm text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => navigate('/')} className="rounded-full btn-pill" data-testid="go-home-btn">
          Go Home
        </Button>
      </div>
    );
  }

  const isWeddingDay = data?.is_wedding_day;
  const totalSeconds = countdown.days * 86400 + countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds;

  return (
    <div className="mobile-container min-h-screen bg-white noise-bg" data-testid="countdown-page">
      {/* Header */}
      <header className="p-6 flex justify-center">
        <div className="w-20 h-20 rounded-full border border-border/30 flex items-center justify-center bg-white/80 shadow-soft">
          <img src={LOGO_URL} alt="aisle & after" className="h-16" />
        </div>
      </header>

      <main className="px-6 pb-12 text-center">
        {/* Event Name */}
        <div className="mb-8 animate-fade-up">
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground tracking-tight mb-2" data-testid="event-name">
            {data?.event_name}
          </h1>
          <div className="flex items-center justify-center gap-4 font-sans text-sm text-muted-foreground">
            {data?.wedding_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(data.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {data?.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {data.venue}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-12 h-px bg-border/60 mx-auto mb-8" />

        {isWeddingDay ? (
          /* Wedding Day Active */
          <div className="space-y-6 animate-fade-up">
            <div className="bg-foreground text-white p-6 rounded-2xl">
              <div className="w-14 h-14 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 wedding-day-pulse">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="font-serif text-3xl tracking-tight mb-2">It's the Big Day!</h2>
              <p className="font-sans text-sm text-white/70">
                Wedding Day Mode is active. Join now to start matching!
              </p>
            </div>

            <Button
              onClick={handleJoin}
              className="bg-foreground hover:bg-foreground/90 rounded-full btn-pill h-14 px-10 text-base"
              data-testid="join-now-btn"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Join the Party
            </Button>
          </div>
        ) : (
          /* Countdown */
          <div className="space-y-8 animate-fade-up">
            <div>
              <p className="font-sans text-xs tracking-[0.2em] text-muted-foreground/70 uppercase mb-6">
                {totalSeconds > 0 ? 'Counting down to love' : 'The celebration has begun'}
              </p>
              <div className="flex justify-center gap-3 sm:gap-4" data-testid="countdown-digits">
                <CountdownDigit value={countdown.days} label="Days" />
                <div className="font-serif text-2xl text-muted-foreground/30 self-center mb-6">:</div>
                <CountdownDigit value={countdown.hours} label="Hours" />
                <div className="font-serif text-2xl text-muted-foreground/30 self-center mb-6">:</div>
                <CountdownDigit value={countdown.minutes} label="Min" />
                <div className="font-serif text-2xl text-muted-foreground/30 self-center mb-6">:</div>
                <CountdownDigit value={countdown.seconds} label="Sec" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="font-serif text-2xl text-foreground">{data?.guests_joined || 0}</p>
                <p className="font-sans text-xs text-muted-foreground">Guests Joined</p>
              </div>
              <div className="w-px h-10 bg-border/40 self-center" />
              <div className="text-center">
                <p className="font-serif text-2xl text-foreground">{data?.matches_made || 0}</p>
                <p className="font-sans text-xs text-muted-foreground">Matches Made</p>
              </div>
            </div>
          </div>
        )}

        {/* Join CTA */}
        {!isWeddingDay && (
          <div className="mt-10 space-y-4">
            <div className="w-12 h-px bg-border/60 mx-auto" />
            <p className="font-sans text-xs text-muted-foreground/70">
              Ready to find your match?
            </p>
            <Button
              onClick={handleJoin}
              className="bg-foreground hover:bg-foreground/90 rounded-full btn-pill h-12 px-8"
              data-testid="join-event-btn"
            >
              Join with Code {data?.event_code}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* QR Code */}
        <div className="mt-10 space-y-3" data-testid="qr-section">
          <div className="w-12 h-px bg-border/60 mx-auto" />
          <p className="font-sans text-xs tracking-[0.15em] text-muted-foreground/60 uppercase">Scan to Join</p>
          <div className="inline-block card-modern p-3">
            <img 
              src={`${API}/countdown/${eventCode}/qr`}
              alt="QR Code"
              className="w-32 h-32"
              data-testid="qr-code-img"
            />
          </div>
        </div>

        {/* Share hint */}
        <p className="font-sans text-xs text-muted-foreground/50 mt-10">
          Share this page with the wedding guests
        </p>
      </main>
    </div>
  );
}
